/**
 * Recovering a session's launch flags from its recorded argv (Phase 19 item 8).
 *
 * These are ROUND TRIP tests, not shape tests. Each one builds the launch argv
 * the create path would actually have built for a set of flags, writes it into
 * a manifest row the way create writes it, and then asks for the flags back.
 * That is the only form of test that stays true when the argv composition
 * changes, because both halves go through the same registry functions the
 * product uses.
 *
 * The case that matters most is claude, where three generated things sit in
 * the same argv as the user's: the resolved binary path, a pre-assigned
 * conversation id, and a `--settings` file keyed to the session id. Handing
 * any of those back to a create would give the new session the old session's
 * conversation.
 */

import { describe, expect, it, vi } from 'vitest';

const USER_DATA = '/tmp/tortie-extras-test';

vi.mock('electron', () => ({
  app: { getPath: () => USER_DATA }
}));

const { recoverLaunchExtras } = await import('../extras');
const { claudeHookSettingsPath } = await import('../../activity/hooks');
const { buildLaunchSpec } = await import('../../manifest/agents');
const { LAUNCHABLE_AGENT_IDS } = await import('../../agents/registry');
const { withClaudeSettingsFlag } = await import('../../activity/hooks');

import type { ManifestSessionRecord } from '../../manifest/store';
import type { LaunchableAgentKind } from '@shared/types';

const SESSION_ID = '11111111-2222-3333-4444-555555555555';

/** A manifest row shaped the way createSession writes one. */
function row(
  agent: string,
  argv: string[],
  over: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  return {
    id: SESSION_ID,
    name: 'auth',
    tmuxName: 'auth',
    projectPath: '/repo',
    cwd: '/repo',
    agent: agent as ManifestSessionRecord['agent'],
    status: 'exited',
    createdAt: 0,
    argv,
    lastSeen: 0,
    ...over
  };
}

/** The argv the create path builds for this agent and these flags. */
function launchArgv(agent: LaunchableAgentKind, extras: string[]): {
  argv: string[];
  agentSessionId?: string;
} {
  const spec = buildLaunchSpec(agent, extras, `/usr/local/bin/${agent}`);
  return spec.agentSessionId !== undefined
    ? { argv: spec.argv, agentSessionId: spec.agentSessionId }
    : { argv: spec.argv };
}

describe('every launchable agent gives its flags back', () => {
  const EXTRAS = ['--model', 'opus', '--add-dir', '/other'];

  for (const agent of LAUNCHABLE_AGENT_IDS) {
    it(`${agent}`, () => {
      const built = launchArgv(agent, EXTRAS);
      const rec = row(agent, built.argv, {
        ...(built.agentSessionId !== undefined
          ? { agentSessionId: built.agentSessionId }
          : {})
      });
      expect(recoverLaunchExtras(rec)).toEqual(EXTRAS);
    });
  }

  it('a session launched with no flags comes back with none', () => {
    const built = launchArgv('claude', []);
    const rec = row('claude', built.argv, {
      ...(built.agentSessionId !== undefined
        ? { agentSessionId: built.agentSessionId }
        : {})
    });
    expect(recoverLaunchExtras(rec)).toEqual([]);
  });
});

describe('the generated parts never come back as flags', () => {
  it('drops claude’s pre-assigned conversation id', () => {
    const built = launchArgv('claude', ['--model', 'opus']);
    const rec = row('claude', built.argv, {
      agentSessionId: built.agentSessionId ?? ''
    });
    const out = recoverLaunchExtras(rec) ?? [];
    expect(out).not.toContain('--session-id');
    expect(out).not.toContain(built.agentSessionId);
  });

  it('drops the hook settings file main injects for claude', () => {
    const built = launchArgv('claude', ['--model', 'opus']);
    const argv = withClaudeSettingsFlag(
      built.argv,
      claudeHookSettingsPath(SESSION_ID)
    );
    const rec = row('claude', argv, {
      agentSessionId: built.agentSessionId ?? ''
    });
    expect(recoverLaunchExtras(rec)).toEqual(['--model', 'opus']);
  });

  it('keeps a --settings the USER passed, because that one is theirs', () => {
    const built = launchArgv('claude', ['--settings', '/home/me/mine.json']);
    const rec = row('claude', built.argv, {
      agentSessionId: built.agentSessionId ?? ''
    });
    expect(recoverLaunchExtras(rec)).toEqual([
      '--settings',
      '/home/me/mine.json'
    ]);
  });
});

describe('a captured session reads its flags off the unwrapped argv', () => {
  it('not off the specstory wrapper, where they are inside a -c string', () => {
    const built = launchArgv('claude', ['--model', 'opus']);
    const rec = row(
      'claude',
      [
        '/opt/specstory',
        'run',
        'claude',
        '--no-version-check',
        '-c',
        built.argv.join(' ')
      ],
      {
        agentSessionId: built.agentSessionId ?? '',
        specstory: {
          enabled: true,
          provider: 'claude',
          bin: '/opt/specstory',
          binVersion: null,
          agentArgv: built.argv,
          exitCodeFidelity: 'exact'
        } as ManifestSessionRecord['specstory']
      }
    );
    expect(recoverLaunchExtras(rec)).toEqual(['--model', 'opus']);
  });
});

describe('a shell pane', () => {
  // PHASE 74. `-l` at index 1 is GENERATED now, so it is no longer one of the
  // user's flags. This block used to assert that ['/bin/zsh', '-l'] gave back
  // ['-l'], and that expectation is wrong from this phase on: restart would
  // report a flag the person never typed and would then build
  // ['/bin/zsh', '-l', '-l'].
  it('does not hand back the login flag this build generates', () => {
    const rec = row('shell', ['/bin/zsh', '-l']);
    expect(recoverLaunchExtras(rec)).toEqual([]);
  });

  it('gives back everything after the login flag', () => {
    const rec = row('shell', ['/bin/zsh', '-l', '--no-rcs']);
    expect(recoverLaunchExtras(rec)).toEqual(['--no-rcs']);
  });

  it('a row from an older build has no flag to drop', () => {
    const rec = row('shell', ['/bin/zsh']);
    expect(recoverLaunchExtras(rec)).toEqual([]);
  });

  it('keeps a -c command whole, quoting and all', () => {
    const command = 'while true; do date; sleep 1; done';
    const rec = row('shell', ['/bin/zsh', '-l', '-c', command]);
    expect(recoverLaunchExtras(rec)).toEqual(['-c', command]);
  });

  // The round trip is what proves restart does not drift. Feed the recovered
  // extras back through the create path and the argv must come out the same,
  // except for the older-build row, which gains the flag it should always have
  // had.
  it('round trips through buildLaunchSpec', () => {
    const cases: Array<{ argv: string[]; back: string[] }> = [
      { argv: ['/bin/zsh', '-l'], back: ['/bin/zsh', '-l'] },
      { argv: ['/bin/zsh', '-l', '--no-rcs'], back: ['/bin/zsh', '-l', '--no-rcs'] },
      { argv: ['/bin/zsh'], back: ['/bin/zsh', '-l'] },
      {
        argv: ['/bin/zsh', '-l', '-c', 'while true; do date; sleep 1; done'],
        back: ['/bin/zsh', '-l', '-c', 'while true; do date; sleep 1; done']
      }
    ];
    for (const c of cases) {
      const extras = recoverLaunchExtras(row('shell', c.argv)) ?? [];
      const rebuilt = buildLaunchSpec('shell', extras, c.argv[0]);
      expect(rebuilt.argv).toEqual(c.back);
    }
  });
});

describe('when the flags cannot be proven the answer is null, not empty', () => {
  // A row that says it has a pre-assigned conversation id, with an argv that
  // does not carry the pair that would have assigned it. Either the row or the
  // argv is wrong, and the honest answer is that the flags are unknown rather
  // than "the id flag was one of the user's".
  it('a pre-assigned row whose argv never carried the id', () => {
    const rec = row('claude', ['/usr/local/bin/claude', '--model', 'opus'], {
      agentSessionId: SESSION_ID
    });
    expect(recoverLaunchExtras(rec)).toBeNull();
  });

  // The mirror of the case above, and the reason it is not a defect: with no
  // id recorded there is nothing generated in the argv at all, so everything
  // after the binary really is the user's.
  it('but a row with no id reads its whole tail as flags, which is right', () => {
    const rec = row('claude', ['/usr/local/bin/claude', '--model', 'opus']);
    expect(recoverLaunchExtras(rec)).toEqual(['--model', 'opus']);
  });

  it('an agent that is not in the registry', () => {
    const rec = row('nosuchagent', ['/usr/bin/nosuchagent', '--flag']);
    expect(recoverLaunchExtras(rec)).toBeNull();
  });

  it('an empty argv', () => {
    const rec = row('claude', []);
    expect(recoverLaunchExtras(rec)).toBeNull();
  });
});
