/**
 * Restart never destroys the original first (Phase 19 item 8).
 *
 * The defect this replaces was one line of ordering: `discard()` and then
 * `create()`. Discard deletes the manifest row, the scrollback snapshot and
 * the hook settings file, so every way a create can fail was a way to lose a
 * session from a button with no undo. R33 asked for exactly this proof, in
 * these words: "Force `create` to throw at each failure point; assert row,
 * snapshot and hook settings all survive."
 *
 * The host below is a fake, and it is a fake on purpose. Driving the real core
 * would test tmux; what is under test here is an ORDER, and an order is proven
 * by recording the calls and reading them back.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreateSessionInput, Session } from '@shared/types';

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp/tortie-restart-test' }
}));

const { restartSession } = await import('../restart');
import type { RestartHost } from '../restart';
import type { ManifestSessionRecord } from '../../manifest/store';

const SESSION_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function record(over: Partial<ManifestSessionRecord> = {}): ManifestSessionRecord {
  return {
    id: SESSION_ID,
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo/api',
    agent: 'shell',
    status: 'exited',
    createdAt: 0,
    argv: ['/bin/zsh', '-l'],
    lastSeen: 0,
    ...over
  };
}

interface Fake {
  host: RestartHost;
  /** Every call this restart made, in order. */
  calls: string[];
  /** What createSession was handed. */
  created: CreateSessionInput[];
}

function fake(
  rec: ManifestSessionRecord,
  createFails?: Error
): Fake {
  const calls: string[] = [];
  const created: CreateSessionInput[] = [];
  const host: RestartHost = {
    manifest: { getSession: (id) => (id === rec.id ? rec : undefined) },
    createSession: async (input) => {
      calls.push('create');
      created.push(input);
      if (createFails !== undefined) throw createFails;
      const session: Session = {
        id: 'new-session',
        name: input.name,
        tmuxName: `${input.name}-2`,
        projectPath: input.projectPath,
        cwd: input.cwd ?? input.projectPath,
        agent: input.agent,
        status: 'running',
        createdAt: 1
      };
      return session;
    },
    killSession: async () => {
      calls.push('kill');
    },
    discardSession: () => {
      calls.push('discard');
    },
    broadcastSessions: () => {
      calls.push('broadcast');
    }
  };
  return { host, calls, created };
}

let warned: string[] = [];

beforeEach(() => {
  warned = [];
  vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    warned.push(args.join(' '));
  });
});

describe('the order', () => {
  it('creates the replacement before it discards anything', async () => {
    const f = fake(record());
    await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
  });

  it('discards nothing at all when the create fails', async () => {
    const f = fake(record(), new Error('claude not found'));
    await expect(restartSession(f.host, SESSION_ID)).rejects.toThrow(
      'claude not found'
    );
    expect(f.calls).toEqual(['create']);
    expect(f.calls).not.toContain('discard');
  });

  it('rethrows the create’s own error, so the user reads the real reason', async () => {
    const f = fake(record(), new Error('The project folder does not exist.'));
    await expect(restartSession(f.host, SESSION_ID)).rejects.toThrow(
      'The project folder does not exist.'
    );
  });

  it('refuses a session id that is not in the manifest', async () => {
    const f = fake(record());
    await expect(restartSession(f.host, 'no-such-id')).rejects.toThrow(
      /no session/i
    );
    expect(f.calls).toEqual([]);
  });
});

describe('a row that is still live', () => {
  it('is stopped after the replacement exists and before the discard', async () => {
    const f = fake(record({ status: 'running' }));
    const out = await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'kill', 'discard', 'broadcast']);
    expect(out.killedOld).toBe(true);
  });

  it('is not stopped when it had already exited', async () => {
    const f = fake(record({ status: 'exited' }));
    const out = await restartSession(f.host, SESSION_ID);
    expect(f.calls).not.toContain('kill');
    expect(out.killedOld).toBe(false);
  });

  it('still finishes the restart when the kill fails', async () => {
    const f = fake(record({ status: 'running' }));
    f.host.killSession = async () => {
      f.calls.push('kill');
      throw new Error('tmux went away');
    };
    const out = await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'kill', 'discard', 'broadcast']);
    expect(out.killedOld).toBe(false);
    expect(warned.join('\n')).toContain('could not stop the old');
  });
});

describe('what the replacement is created with', () => {
  it('the same name, project and working directory', async () => {
    const f = fake(record());
    await restartSession(f.host, SESSION_ID);
    expect(f.created[0]).toMatchObject({
      name: 'auth',
      projectPath: '/repo',
      cwd: '/repo/api',
      agent: 'shell'
    });
  });

  it('the launch flags the original was started with', async () => {
    const f = fake(record({ argv: ['/bin/zsh', '-l', '-c', 'htop'] }));
    await restartSession(f.host, SESSION_ID);
    // Phase 74: the `-l` at index 1 is generated by the create path now, so it
    // is not one of the user's flags. The replacement gets it back from
    // buildLaunchSpec, and reporting it here would build ['/bin/zsh','-l','-l'].
    expect(f.created[0]?.extraArgs).toEqual(['-c', 'htop']);
  });

  it('no extraArgs key at all when there were no flags', async () => {
    const f = fake(record({ argv: ['/bin/zsh'] }));
    await restartSession(f.host, SESSION_ID);
    expect(f.created[0] && 'extraArgs' in f.created[0]).toBe(false);
  });

  it('capture: true when the original was captured', async () => {
    const f = fake(
      record({
        specstory: {
          enabled: true,
          provider: 'shell',
          bin: '/opt/specstory',
          binVersion: null,
          agentArgv: ['/bin/zsh', '-l'],
          exitCodeFidelity: 'exact'
        } as ManifestSessionRecord['specstory']
      })
    );
    const out = await restartSession(f.host, SESSION_ID);
    expect(f.created[0]?.capture).toBe(true);
    expect(out.capture).toBe(true);
  });

  it('no capture key at all when the original was not captured', async () => {
    const f = fake(record());
    await restartSession(f.host, SESSION_ID);
    // Absent, not false. That is the shape every uncaptured create sends, and
    // main reads exactly `=== true`.
    expect(f.created[0] && 'capture' in f.created[0]).toBe(false);
  });
});

describe('when the flags cannot be recovered', () => {
  it('the restart still happens and the log says the flags were lost', async () => {
    const f = fake(
      record({ agent: 'claude', argv: ['/usr/local/bin/claude', '--model'], agentSessionId: 'x' })
    );
    const out = await restartSession(f.host, SESSION_ID);
    expect(out.extrasRecovered).toBe(false);
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
    expect(warned.join('\n')).toContain('without its launch flags');
  });
});
