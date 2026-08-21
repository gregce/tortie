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
import { RESTART_ON_MACHINE } from '../../machines/remote-copy';

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

/**
 * PHASE 84. A row whose session runs on another machine.
 *
 * The defect this covers lost work rather than annoying somebody. A restart of
 * such a row created the replacement on this Mac, because the composed input
 * carries no machine, and then hard deleted the original row. The agent kept
 * running on the other machine with nothing pointing at it.
 *
 * What is proven here is that NOTHING HAPPENED. Zero creates, zero kills, zero
 * discards, zero broadcasts, and a rejection carrying the sentence a person
 * reads. An order is proven by recording the calls, and so is an absence.
 */
describe('a session that runs on another machine', () => {
  it('is refused, and nothing at all is created or removed', async () => {
    const f = fake(record({ machineId: 'studio', status: 'running' }));
    await expect(restartSession(f.host, SESSION_ID)).rejects.toThrow(
      RESTART_ON_MACHINE
    );
    expect(f.calls).toEqual([]);
    expect(f.created).toEqual([]);
  });

  it('is refused whatever the row says it is doing', async () => {
    for (const status of ['running', 'idle', 'exited', 'restorable'] as const) {
      const f = fake(record({ machineId: 'studio', status }));
      await expect(restartSession(f.host, SESSION_ID)).rejects.toThrow(
        RESTART_ON_MACHINE
      );
      expect(f.calls).toEqual([]);
    }
  });

  it('says why, and names neither a machine nor any transport word', async () => {
    const f = fake(record({ machineId: 'studio' }));
    let message = '';
    try {
      await restartSession(f.host, SESSION_ID);
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toContain('runs on another machine');
    expect(message).toContain('Nothing was changed.');
    for (const word of ['pane', 'window', 'prefix', 'socket', 'ssh', 'tmux']) {
      expect(message.toLowerCase()).not.toContain(word);
    }
  });

  it('restarts a row that names this Mac exactly as it always did', async () => {
    const f = fake(record({ machineId: 'local' }));
    await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
  });

  it('restarts a row written before machines existed, which names none', async () => {
    const f = fake(record());
    expect(f.host.manifest.getSession(SESSION_ID)?.machineId).toBeUndefined();
    await restartSession(f.host, SESSION_ID);
    expect(f.calls).toEqual(['create', 'discard', 'broadcast']);
  });
});

// ---------------------------------------------------------------------------
// PHASE 119. A restart can decline capture, and the answer outranks the old
// row. Nothing is flipped on that row, because step 4 discards it: the
// replacement is bare from birth and there is no setting left to change.
// ---------------------------------------------------------------------------

/** A row whose capture record says the original saved its history. */
function captured(): ManifestSessionRecord {
  return record({
    specstory: {
      enabled: true,
      provider: 'shell',
      bin: '/opt/specstory',
      binVersion: null,
      agentArgv: ['/bin/zsh', '-l', '-c', 'htop'],
      exitCodeFidelity: 'exact'
    } as ManifestSessionRecord['specstory'],
    argv: ['/bin/zsh', '-l', '-c', 'htop']
  });
}

describe('a restart that declines capture', () => {
  it('sends no capture key at all, whatever the old row said', async () => {
    const f = captured();
    const h = fake(f);
    const out = await restartSession(h.host, SESSION_ID, {
      withoutCapture: true
    });
    // Absent, not false. `capture: false` is a shape the create path has never
    // been sent, and main reads exactly `=== true`.
    expect(h.created[0] && 'capture' in h.created[0]).toBe(false);
    expect(out.capture).toBe(false);
  });

  it('keeps the four step order and the launch flags', async () => {
    const h = fake(captured());
    const out = await restartSession(h.host, SESSION_ID, {
      withoutCapture: true
    });
    expect(h.calls).toEqual(['create', 'discard', 'broadcast']);
    expect(out.extrasRecovered).toBe(true);
    expect(h.created[0]?.extraArgs).toEqual(['-c', 'htop']);
  });

  it('says in the log that the person asked for it', async () => {
    const h = fake(captured());
    await restartSession(h.host, SESSION_ID, { withoutCapture: true });
    const line = warned.join('\n');
    expect(line).toContain('came back without SpecStory');
    expect(line).toContain('does not save its history');
  });

  it('says nothing when the old row was not captured anyway', async () => {
    const h = fake(record());
    const out = await restartSession(h.host, SESSION_ID, {
      withoutCapture: true
    });
    expect(out.capture).toBe(false);
    expect(warned.join('\n')).not.toContain('came back without SpecStory');
  });

  it('leaves the ordinary restart alone when the option is omitted', async () => {
    const h = fake(captured());
    const out = await restartSession(h.host, SESSION_ID);
    expect(h.created[0]?.capture).toBe(true);
    expect(out.capture).toBe(true);
    expect(warned.join('\n')).not.toContain('came back without SpecStory');
  });

  it('refuses a row on another machine before it reads the option', async () => {
    const h = fake(record({ machineId: 'mac-mini' }));
    await expect(
      restartSession(h.host, SESSION_ID, { withoutCapture: true })
    ).rejects.toThrow(RESTART_ON_MACHINE);
    expect(h.calls).toEqual([]);
  });
});
