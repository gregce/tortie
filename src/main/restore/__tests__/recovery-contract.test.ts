/**
 * The restore READ path after Phase 21 (research 33 §2.1, A8).
 *
 * Two behaviours are under test and they are the same defect from two sides.
 *
 * 1. Restore reads the ROW. The recorded contract decides whether the original
 *    directory is load bearing, and a live registry that has since changed its
 *    mind does not get a vote. The proof is a row whose contract DISAGREES
 *    with the registry, in both directions, plus a row whose agent the
 *    registry does not know at all.
 * 2. Restore says one sentence when the agent build has moved under a session,
 *    or when the binary the armed line names is gone. It still arms the
 *    resume, it never refuses, and it never rewrites the argv.
 *
 * The old `catch` returned `false` for an id the registry no longer launches,
 * and `false` means "any directory is fine". For a pi shaped agent that is a
 * pane that looks resumed with an empty conversation behind it.
 *
 * tmux and the agent detection scan are both mocked. This is about the
 * decision and the wording, not the plumbing, and a unit test must never
 * spawn an agent CLI.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentRecoveryContract } from '../../manifest/agents';
import type { ManifestSessionRecord } from '../../manifest';

const createSession = vi.fn(async (opts: { cwd: string }) => ({
  sessionId: '$77',
  tmuxName: 'zz-contract-test',
  cwd: opts.cwd,
  panePid: 4343
}));

/** Every `send-keys` payload, in order, so the pane text can be asserted. */
const typed: string[] = [];

vi.mock('../../tmux', async () => {
  const errors =
    await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    createSession: (opts: { cwd: string }) => createSession(opts),
    execTmux: vi.fn(async (args: string[]) => {
      if (args[0] === 'send-keys' && args[3] === '-l') typed.push(args[4] ?? '');
      return '';
    }),
    managedPaneEnv: () => ({})
  };
});

vi.mock('../snapshots', () => ({ resolveSnapshot: () => null }));

/** The detection scan the drift check reads. One agent, one version. */
let liveVersion: string | null = '2.1.228 (Claude Code)';
vi.mock('../../agents/detection', () => ({
  listDetectedAgents: async () => ({
    agents: [
      {
        id: 'claude',
        displayName: 'Claude Code',
        kind: 'cli' as const,
        launchable: true,
        installed: true,
        binPath: '/opt/homebrew/bin/claude',
        version: liveVersion,
        storeDetected: true,
        iconKey: 'claude',
        unverified: false
      }
    ],
    scannedAt: 1
  })
}));

import {
  agentDriftSentence,
  agentVersionChange,
  originalCwdRule,
  restoreSessionInTmux,
  storeRootOfTemplate,
  trimVersionLabel
} from '../restore';

let root: string;
let gone: string;
let liveBin: string;

const as = (id: string): ManifestSessionRecord['agent'] =>
  id as ManifestSessionRecord['agent'];

/** A recorded contract, with only the fields these tests care about set. */
function contract(over: Partial<AgentRecoveryContract>): AgentRecoveryContract {
  return {
    v: 1,
    at: 1,
    bin: '/abs/agent',
    requiresOriginalCwd: false,
    bareResumeIsDangerous: false,
    resumeStrategy: 'flag-uuid',
    resumeTemplate: ['--resume', '<sessionId>'],
    resumeExtrasPosition: 'trailing',
    idCapture: 'preassigned',
    sessionStore: '~/.claude/projects/<dashEncode(realpath(cwd))>/<sessionId>.jsonl',
    cwdReal: '/abs/cwd',
    projectReal: '/abs/cwd',
    captureRouteVerified: true,
    flagsVerifiedVersion: '2.1.226 (Claude Code)',
    flagsVerifiedAgainst: 'other-version',
    ...over
  };
}

function rec(over: Partial<ManifestSessionRecord>): ManifestSessionRecord {
  return {
    id: 'sess-c1',
    name: 'pi-1',
    tmuxName: 'pi-1',
    projectPath: root,
    cwd: gone,
    agent: as('pi'),
    status: 'restorable',
    createdAt: 1,
    lastSeen: 2,
    argv: ['/abs/pi', '--session-id', 'ID'],
    ...over
  } as ManifestSessionRecord;
}

beforeEach(() => {
  createSession.mockClear();
  typed.length = 0;
  liveVersion = '2.1.228 (Claude Code)';
  root = mkdtempSync(join(tmpdir(), 'gmux-contract-'));
  gone = join(root, 'deleted-worktree');
  liveBin = join(root, 'claude');
  writeFileSync(liveBin, '#!/bin/sh\n');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// 1. The row decides, not the registry
// ---------------------------------------------------------------------------

describe('originalCwdRule — the row is asked first', () => {
  it('a recorded TRUE holds even for claude, whose registry entry says false', () => {
    // The registry says claude's lookup is global. This row says otherwise,
    // because that is what was true when the session was made. The row wins.
    const rule = originalCwdRule(
      rec({ agent: as('claude'), agentContract: contract({ requiresOriginalCwd: true }) })
    );
    expect(rule).toEqual({ needsOriginalCwd: true, basis: 'row' });
  });

  it('a recorded FALSE holds even for pi, whose registry entry says true', () => {
    const rule = originalCwdRule(
      rec({ agentContract: contract({ requiresOriginalCwd: false }) })
    );
    expect(rule).toEqual({ needsOriginalCwd: false, basis: 'row' });
  });

  it('no contract falls back to the registry, which is what old rows get', () => {
    expect(originalCwdRule(rec({}))).toEqual({
      needsOriginalCwd: true,
      basis: 'registry'
    });
  });

  it('an agent the registry does not know REFUSES rather than permits', () => {
    // The defect, in one assertion. This used to return false, and false means
    // "restore it anywhere". For a pi shaped agent that is a silent empty
    // session that looks resumed.
    expect(originalCwdRule(rec({ agent: as('rescinded-agent') }))).toEqual({
      needsOriginalCwd: true,
      basis: 'unknown-agent'
    });
  });

  it('a plain shell has nothing to protect', () => {
    expect(originalCwdRule(rec({ agent: as('shell') }))).toEqual({
      needsOriginalCwd: false,
      basis: 'shell'
    });
  });
});

describe('restoreSessionInTmux — the row decides the substitution', () => {
  it('refuses for an unknown agent with an armed resume and a missing folder', async () => {
    const out = await restoreSessionInTmux(
      rec({
        agent: as('rescinded-agent'),
        name: 'ghost-1',
        resumeArgv: ['/abs/ghost', '--resume', 'ID']
      })
    );
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') return;
    expect(out.stage).toBe('preflight');
    expect(out.reason).toContain('no record of how rescinded-agent finds');
    expect(createSession).not.toHaveBeenCalled();
  });

  it('a recorded FALSE lets pi restore into the project folder', async () => {
    // The registry would refuse this. The row says this session's agent found
    // its conversations globally, and the row is the fact about this session.
    const out = await restoreSessionInTmux(
      rec({
        resumeArgv: ['/abs/pi', '--session-id', 'ID'],
        agentContract: contract({ requiresOriginalCwd: false })
      })
    );
    expect(out.kind).not.toBe('failed');
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: root })
    );
  });

  it('a recorded TRUE refuses for claude, which the registry would allow', async () => {
    const out = await restoreSessionInTmux(
      rec({
        agent: as('claude'),
        name: 'claude-1',
        resumeArgv: ['/abs/claude', '--resume', 'ID'],
        agentContract: contract({ requiresOriginalCwd: true })
      })
    );
    expect(out.kind).toBe('failed');
    if (out.kind !== 'failed') return;
    expect(out.reason).toContain('original folder');
    expect(createSession).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. The version comparison
// ---------------------------------------------------------------------------

describe('agentVersionChange', () => {
  it('identical strings are the same build', () => {
    expect(agentVersionChange('0.147.0', '0.147.0')).toBe('same');
  });

  it('a reformatted version string is still the same build', () => {
    // deepseek printed 'v0.8.26 (npm wrapper, …)' one week and
    // 'deepseek (npm wrapper) v0.8.26' the next. Same binary, new label.
    expect(
      agentVersionChange(
        'v0.8.26 (npm wrapper, node 22)',
        'deepseek (npm wrapper) v0.8.26'
      )
    ).toBe('same');
  });

  it('a patch bump is silent — five of nine agents moved in three days', () => {
    expect(agentVersionChange('2.1.226 (Claude Code)', '2.1.228 (Claude Code)')).toBe(
      'patch'
    );
  });

  it('a minor bump is worth saying', () => {
    expect(agentVersionChange('0.21.7', '0.22.0')).toBe('significant');
  });

  it('a major bump is worth saying', () => {
    expect(agentVersionChange('1.0.2', '2.1.12')).toBe('significant');
  });

  it('a date stamped build treats any move as significant', () => {
    // cursor ships 2026.08.11-e8db854. Its third component is a DAY, so a
    // one day move is a whole new build rather than a patch.
    expect(agentVersionChange('2026.08.11-e8db854', '2026.08.12-aa11bb2')).toBe(
      'significant'
    );
  });

  it('two strings that cannot be compared are worth saying', () => {
    expect(agentVersionChange('nightly', 'preview')).toBe('significant');
  });

  it('two unparseable but identical strings are not', () => {
    expect(agentVersionChange('nightly', 'nightly')).toBe('same');
  });
});

describe('trimVersionLabel', () => {
  it("drops claude's trailing identity suffix", () => {
    expect(trimVersionLabel('2.1.229 (Claude Code)', 'Claude Code')).toBe('2.1.229');
  });

  it("drops muse's leading name", () => {
    expect(trimVersionLabel('Muse Code 0.1.0 (0.1.0-R708.1)', 'Muse Code')).toBe(
      '0.1.0 (0.1.0-R708.1)'
    );
  });

  it('leaves a version it does not recognise alone', () => {
    expect(trimVersionLabel('deepseek (npm wrapper) v0.8.26', 'DeepSeek TUI')).toBe(
      'deepseek (npm wrapper) v0.8.26'
    );
  });

  it('never trims a version down to nothing', () => {
    expect(trimVersionLabel('(Claude Code)', 'Claude Code')).toBe('(Claude Code)');
  });
});

describe('storeRootOfTemplate', () => {
  it('keeps the part of the path a user can open', () => {
    expect(
      storeRootOfTemplate('~/.claude/projects/<dashEncode(realpath(cwd))>/<id>.jsonl')
    ).toBe('~/.claude/projects');
  });

  it('stops at an environment variable rather than printing one', () => {
    expect(storeRootOfTemplate('${CODEX_HOME:-~/.codex}/sessions/<YYYY>')).toBe(null);
  });

  it('never returns a bare tilde, which says nothing', () => {
    expect(storeRootOfTemplate('~/<id>.jsonl')).toBe(null);
  });
});

// ---------------------------------------------------------------------------
// 3. The sentence
// ---------------------------------------------------------------------------

describe('agentDriftSentence', () => {
  const base = {
    displayName: 'Claude Code',
    binary: '/opt/homebrew/bin/claude',
    binaryMissing: false,
    recordedVersion: '2.1.226 (Claude Code)',
    liveVersion: '2.1.228 (Claude Code)',
    storeRoot: '~/.claude/projects'
  };

  it('says nothing for a patch bump', () => {
    expect(agentDriftSentence(base)).toBe(null);
  });

  it('says nothing when the row has no recorded version', () => {
    expect(agentDriftSentence({ ...base, recordedVersion: null })).toBe(null);
  });

  it('says nothing when no version can be detected now', () => {
    expect(agentDriftSentence({ ...base, liveVersion: null })).toBe(null);
  });

  it('names both builds and the store on a real move', () => {
    // The agent's own name is taken back out of the version string, or the
    // sentence would read "Claude Code 2.1.226 (Claude Code)".
    const s = agentDriftSentence({ ...base, liveVersion: '3.0.0 (Claude Code)' });
    expect(s).toBe(
      'This session ran under Claude Code 2.1.226. Version 3.0.0 is ' +
        'installed now. If the conversation does not come back, it is still ' +
        'in ~/.claude/projects.'
    );
  });

  it('a missing binary outranks the version, because the line cannot run', () => {
    const s = agentDriftSentence({ ...base, binaryMissing: true });
    expect(s).toContain('/opt/homebrew/bin/claude, and that file is not there now');
    expect(s).toContain('until Claude Code is installed again');
    expect(s).toContain('~/.claude/projects');
  });

  it('leaves the store out when it is not known', () => {
    const s = agentDriftSentence({
      ...base,
      binaryMissing: true,
      storeRoot: null
    });
    expect(s).not.toContain('still in');
  });
});

// ---------------------------------------------------------------------------
// 4. The sentence reaches the pane, above the armed command
// ---------------------------------------------------------------------------

describe('restoreSessionInTmux — the drift surface', () => {
  const drifted = (over: Partial<ManifestSessionRecord> = {}) =>
    rec({
      agent: as('claude'),
      name: 'claude-1',
      cwd: root,
      resumeArgv: [liveBin, '--resume', 'ID'],
      agentVersion: '1.9.0 (Claude Code)',
      agentContract: contract({ requiresOriginalCwd: false }),
      ...over
    });

  it('prints one sentence and STILL arms the resume, unchanged', async () => {
    const out = await restoreSessionInTmux(drifted());
    expect(out.kind).toBe('armed');
    if (out.kind !== 'armed') return;
    expect(out.versionDrift).toContain('Claude Code 1.9.0');
    expect(out.versionDrift).toContain('Version 2.1.228 is installed now');
    // The argv is typed exactly as recorded. The sentence is information, not
    // a repair, and a restore that rewrote an argv would be a worse product.
    expect(out.armedCommand).toBe(`${liveBin} --resume ID`);

    // Order matters: the sentence is executed ABOVE the armed line, so the
    // armed command is still the last thing on screen with the cursor on it.
    const notice = typed.findIndex((t) => t.includes('printf'));
    const arm = typed.findIndex((t) => t === `${liveBin} --resume ID`);
    expect(notice).toBeGreaterThanOrEqual(0);
    expect(arm).toBeGreaterThan(notice);
    expect(typed[notice]).toContain('Tortie:');
  });

  it('says nothing when the build has not moved', async () => {
    liveVersion = '1.9.0 (Claude Code)';
    const out = await restoreSessionInTmux(drifted());
    expect(out.kind).toBe('armed');
    if (out.kind !== 'armed') return;
    expect(out.versionDrift).toBeUndefined();
    expect(typed.some((t) => t.includes('Tortie:'))).toBe(false);
  });

  it('says nothing for a row written before the migration', async () => {
    const out = await restoreSessionInTmux(
      drifted({ agentVersion: undefined, agentContract: undefined })
    );
    expect(out.kind).toBe('armed');
    if (out.kind !== 'armed') return;
    expect(out.versionDrift).toBeUndefined();
  });

  it('warns when the binary the armed line names is gone', async () => {
    // No recorded version at all, so this is the check that covers a package
    // that renamed itself out from under an existing row.
    const out = await restoreSessionInTmux(
      drifted({
        agentVersion: undefined,
        resumeArgv: [join(root, 'vanished-claude'), '--resume', 'ID']
      })
    );
    expect(out.kind).toBe('armed');
    if (out.kind !== 'armed') return;
    expect(out.versionDrift).toContain('is not there now');
  });

  it('nothing is printed when there is no resume to arm', async () => {
    const out = await restoreSessionInTmux(
      drifted({ resumeArgv: [], agent: as('shell') })
    );
    expect(out.kind).toBe('shell_only');
    expect(typed.some((t) => t.includes('Tortie:'))).toBe(false);
  });
});
