/**
 * Phase 331 — a person's own flags, with the registry's fixed launch tokens
 * set aside.
 *
 * Codex's row now fixes two tokens after its binary,
 * `-c tui.fullscreen_transcript=false` (`CODEX_SCROLLBACK_ARGS`), on its launch
 * and on its resume template. Three readers recover or recompose "the flags
 * this session was launched with" from a recorded argv, and each must set
 * those two tokens aside, because the composer puts them back:
 *
 *  - `agentExtrasOf`, which feeds the rescue, admission and repair
 *    recompositions (and the create-time harvest is handed the create's own
 *    extras, which never held the pair);
 *  - `recoverLaunchExtras`, which is what Restart creates the replacement from;
 *  - `writeRemoteHarvest`, the one recomposition `agentExtrasOf` does not reach.
 *
 * Without the helper the harvest composes the pair once and the others twice,
 * and Restart silently drops the `--yolo` of every codex row written before
 * the phase. Rows written before the phase have no pair at all, and still
 * read right. These are the owners `build/p331/ablation.mjs` names for C3, C4
 * and C5.
 *
 * HERMETIC. `electron` is mocked onto a scratch directory under the system
 * temp directory; the one manifest this file writes is a temp `ManifestStore`
 * removed in `afterEach`; no agent, no tmux and no SpecStory binary runs.
 */

import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let userData = '';

vi.mock('electron', () => ({
  app: { getPath: () => userData, getVersion: () => '0.0.0-p331' }
}));

const {
  CODEX_SCROLLBACK_ARGS,
  LAUNCHABLE_AGENT_IDS,
  ownLaunchFlags,
  registryLaunchArgv,
  registryResumeArgv
} = await import('../../agents/registry');
const { agentExtrasOf } = await import('../launch-plan');
const { composeResumeArgv } = await import('../resume-argv');
const { recoverLaunchExtras } = await import('../../restart/extras');
const { ManifestStore } = await import('../../manifest/store');
const { setRemoteManifest, writeRemoteHarvest, writeRemoteRow } = await import(
  '../../machines/remote-record'
);
const { isWrappedArgv, specstoryQuoteArg, unwrapArgv, wrapArgv } = await import(
  '../../specstory/wrap'
);
const { wrapWithRecord } = await import('../../specstory/capture');
const { commandRunsAgent } = await import('../../activity/state-machine');

import type { ManifestSessionRecord } from '../../manifest/store';
import type { SpecstoryCaptureRecord } from '../../specstory/capture';

const BIN = '/usr/local/bin/codex';
const PAIR = ['-c', 'tui.fullscreen_transcript=false'];
const ID = '01a0696a-75d1-7af1-8f22-de5903c5ebeb';
const SPECSTORY = '/opt/specstory/bin/specstory';
const AT = 1_700_000_000_000;

/** A manifest row shaped the way a create writes one. */
function row(
  agent: string,
  argv: string[],
  over: Partial<ManifestSessionRecord> = {}
): ManifestSessionRecord {
  return {
    id: 'p331-row',
    name: 'p331 row',
    tmuxName: 'p331-row',
    projectPath: '/w',
    cwd: '/w',
    agent: agent as ManifestSessionRecord['agent'],
    status: 'exited',
    createdAt: AT,
    argv,
    lastSeen: AT,
    ...over
  };
}

/** A capture record whose inner argv is `agentArgv`. */
function capture(agentArgv: string[]): SpecstoryCaptureRecord {
  return {
    enabled: true,
    bin: SPECSTORY,
    binVersion: '2.8.0',
    provider: 'codex',
    exitCodeFidelity: 'collapsed',
    agentArgv
  };
}

/** A captured codex row: the wrapper's argv, and the inner argv beside it. */
function captured(inner: string[]): ManifestSessionRecord {
  const rec = capture(inner);
  const wrapped = wrapWithRecord(rec, inner);
  if (wrapped === null) throw new Error('the fixture could not be wrapped');
  return row('codex', wrapped, { specstory: rec });
}

/** How many times the pair appears as two adjacent elements. */
function pairCount(argv: readonly string[]): number {
  let n = 0;
  for (let i = 0; i + 1 < argv.length; i += 1) {
    if (argv[i] === PAIR[0] && argv[i + 1] === PAIR[1]) n += 1;
  }
  return n;
}

beforeEach(() => {
  userData = mkdtempSync(join(tmpdir(), 'p331-own-flags-'));
});

afterEach(() => {
  setRemoteManifest(null);
  rmSync(userData, { recursive: true, force: true });
});

describe('ownLaunchFlags, the one reading of a person\'s own flags', () => {
  it('a row written before this phase: its own flags are everything after the binary', () => {
    expect(ownLaunchFlags('codex', [BIN, '--yolo'])).toEqual(['--yolo']);
    expect(ownLaunchFlags('codex', [BIN])).toEqual([]);
    expect(agentExtrasOf(row('codex', [BIN, '--yolo']))).toEqual(['--yolo']);
    expect(
      agentExtrasOf(row('codex', [BIN, '--sandbox', 'workspace-write', '--search']))
    ).toEqual(['--sandbox', 'workspace-write', '--search']);
  });

  it('a row written after this phase: the pair is set aside and its own flags follow', () => {
    // What a create at HEAD records, composed by the create path's own function.
    const launched = registryLaunchArgv('codex', ['--yolo'], BIN);
    expect(launched).toEqual([BIN, ...PAIR, '--yolo']);
    expect(ownLaunchFlags('codex', launched)).toEqual(['--yolo']);
    expect(agentExtrasOf(row('codex', launched))).toEqual(['--yolo']);
    expect(ownLaunchFlags('codex', [BIN, ...PAIR])).toEqual([]);
    // A person's own opt-out stays theirs, after the pair.
    expect(
      ownLaunchFlags('codex', [BIN, ...PAIR, '-c', 'tui.fullscreen_transcript=true'])
    ).toEqual(['-c', 'tui.fullscreen_transcript=true']);

    // And composing from it puts the pair back ONCE.
    const composed = composeResumeArgv(row('codex', launched), 'codex', ID, agentExtrasOf(row('codex', launched)));
    expect(composed?.argv).toEqual([BIN, 'resume', ID, ...PAIR, '--yolo']);
    expect(pairCount(composed?.argv ?? [])).toBe(1);
  });

  it('a row whose own flags begin with the pair: the leading pair is read as the registry\'s (the stated limit)', () => {
    // A person who typed the pair themselves before the phase wrote exactly
    // the argv a create at HEAD writes, and the argv cannot say who wrote it.
    const theirs = [BIN, ...PAIR, '--yolo'];
    expect(ownLaunchFlags('codex', theirs)).toEqual(['--yolo']);
    // NOTHING RUNS DIFFERENTLY: the composer puts the same pair back in the
    // same place, so the launch and the resume are byte for byte what they
    // would have been with the pair counted as theirs.
    expect(registryLaunchArgv('codex', ownLaunchFlags('codex', theirs), BIN)).toEqual(theirs);
    expect(registryResumeArgv('codex', ID, ownLaunchFlags('codex', theirs), BIN)).toEqual([
      BIN,
      'resume',
      ID,
      ...PAIR,
      '--yolo'
    ]);
  });

  it('a captured row reads its own flags from the capture record, before and after this phase', () => {
    const before = captured([BIN, '--yolo']);
    const after = captured([BIN, ...PAIR, '--yolo']);
    for (const rec of [before, after]) {
      expect(isWrappedArgv(rec.argv)).toBe(true);
      // The wrapper's own words never leak into the agent's flags.
      expect(agentExtrasOf(rec)).toEqual(['--yolo']);
      const composed = composeResumeArgv(rec, 'codex', ID, agentExtrasOf(rec));
      expect(composed?.captureLost).toBe(false);
      expect(unwrapArgv(composed?.argv ?? [])).toEqual([BIN, 'resume', ID, ...PAIR, '--yolo']);
    }
  });

  it('a pre-phase row whose own flags carry the pair after another flag keeps it', () => {
    const theirs = [BIN, '--yolo', ...PAIR];
    expect(ownLaunchFlags('codex', theirs)).toEqual(['--yolo', ...PAIR]);
    expect(agentExtrasOf(row('codex', theirs))).toEqual(['--yolo', ...PAIR]);
  });
});

describe('the three recompositions agree', () => {
  it('the harvest, the rescue and the remote harvest compose byte-identical resume argvs for the same row', () => {
    const extras = ['--yolo'];
    const launched = registryLaunchArgv('codex', extras, BIN);
    const rec = row('codex', launched);

    // The create-time harvest is handed the create's own extras.
    const harvest = composeResumeArgv(rec, 'codex', ID, extras);
    // The rescue, admission and repair paths read the row.
    const rescue = composeResumeArgv(rec, 'codex', ID, agentExtrasOf(rec));

    // The remote harvest, through the real manifest module over a temp store.
    const store = new ManifestStore(join(userData, 'manifest.db'));
    try {
      setRemoteManifest(store);
      writeRemoteRow({
        sessionId: 'p331-far',
        machineId: 'studio',
        name: 'p331 far',
        tmuxName: 'p331-far',
        projectPath: '/w',
        cwd: '/w',
        agent: 'codex',
        argv: launched,
        bin: BIN,
        createdAt: AT
      });
      const remote = writeRemoteHarvest({
        sessionId: 'p331-far',
        machineId: 'studio',
        agent: 'codex',
        conversationId: ID,
        cwd: '/w',
        at: AT,
        key: 'cwd-newest',
        keyConfidence: 'exact',
        rivals: 1,
        storePath: '/w/.codex/sessions/rollout.jsonl',
        storeRoot: '/w/.codex/sessions'
      });

      const expected = [BIN, 'resume', ID, ...PAIR, '--yolo'];
      expect(harvest?.argv).toEqual(expected);
      expect(rescue?.argv).toEqual(expected);
      expect(remote?.resumeArgv).toEqual(expected);
      expect(store.getSession('p331-far')?.resumeArgv).toEqual(expected);
    } finally {
      setRemoteManifest(null);
      store.close();
    }
  });

  it('the remote harvest composes the pair once and keeps the far binary', () => {
    const FAR = '/home/them/.local/bin/codex';
    const store = new ManifestStore(join(userData, 'manifest.db'));
    try {
      setRemoteManifest(store);
      // One row written by a build before the phase, one by a build after it.
      const rows: [string, string[]][] = [
        ['p331-far-before', [FAR, '--yolo']],
        ['p331-far-after', registryLaunchArgv('codex', ['--yolo'], FAR)]
      ];
      for (const [sessionId, argv] of rows) {
        writeRemoteRow({
          sessionId,
          machineId: 'studio',
          name: sessionId,
          tmuxName: sessionId,
          projectPath: '/home/them/w',
          cwd: '/home/them/w',
          agent: 'codex',
          argv,
          bin: FAR,
          createdAt: AT
        });
        const written = writeRemoteHarvest({
          sessionId,
          machineId: 'studio',
          agent: 'codex',
          conversationId: ID,
          cwd: '/home/them/w',
          at: AT,
          key: 'cwd-newest',
          keyConfidence: 'exact',
          rivals: 1,
          storePath: '/home/them/.codex/sessions/rollout.jsonl',
          storeRoot: '/home/them/.codex/sessions'
        });
        const resume = written?.resumeArgv ?? [];
        expect(resume, sessionId).toEqual([FAR, 'resume', ID, ...PAIR, '--yolo']);
        expect(resume[0], sessionId).toBe(FAR);
        expect(pairCount(resume), sessionId).toBe(1);
      }
    } finally {
      setRemoteManifest(null);
      store.close();
    }
  });
});

describe('Restart', () => {
  it('Restart keeps --yolo on a row written before this phase', () => {
    const pre = row('codex', [BIN, '--yolo'], { agentSessionId: ID });
    const extras = recoverLaunchExtras(pre);
    expect(extras).toEqual(['--yolo']);
    // The observable (SPEC §1.2 item 3): the replacement row's recorded argv.
    expect(registryLaunchArgv('codex', extras ?? [], BIN)).toEqual([BIN, ...PAIR, '--yolo']);
    // With no id at all, too.
    expect(recoverLaunchExtras(row('codex', [BIN, '--yolo']))).toEqual(['--yolo']);
    // A pre-phase row with no flags gives none back, not null.
    expect(recoverLaunchExtras(row('codex', [BIN]))).toEqual([]);
    // Captured before the phase: read from the capture record.
    expect(recoverLaunchExtras(captured([BIN, '--yolo']))).toEqual(['--yolo']);
  });

  it('Restart keeps --yolo on a row written after this phase', () => {
    const post = row('codex', registryLaunchArgv('codex', ['--yolo'], BIN), { agentSessionId: ID });
    const extras = recoverLaunchExtras(post);
    expect(extras).toEqual(['--yolo']);
    expect(registryLaunchArgv('codex', extras ?? [], BIN)).toEqual([BIN, ...PAIR, '--yolo']);
    expect(recoverLaunchExtras(captured([BIN, ...PAIR, '--yolo']))).toEqual(['--yolo']);
    // A person's opt-out survives a restart.
    expect(
      recoverLaunchExtras(row('codex', [BIN, ...PAIR, '-c', 'tui.fullscreen_transcript=true']))
    ).toEqual(['-c', 'tui.fullscreen_transcript=true']);
  });
});

describe('the two parsers that treat -c as special', () => {
  it('the SpecStory wrap still finds its own -c around a codex argv carrying the pair', () => {
    // The pair quotes without an escape: `.`, `_` and `=` are safe.
    expect(specstoryQuoteArg('tui.fullscreen_transcript=false')).toBe(
      'tui.fullscreen_transcript=false'
    );
    const create = registryLaunchArgv('codex', ['--yolo'], BIN);
    const resume = registryResumeArgv('codex', ID, ['--yolo'], BIN);
    for (const inner of [create, resume]) {
      const wrapped = wrapArgv({ bin: SPECSTORY, provider: 'codex', inner });
      expect(wrapped).not.toBeNull();
      const argv = wrapped ?? [];
      expect(isWrappedArgv(argv)).toBe(true);
      // Specstory's own `-c` is the FIRST `-c` element, and the whole agent
      // command, the pair included, is the ONE element after it.
      const c = argv.indexOf('-c');
      expect(argv.slice(0, c)).toEqual([SPECSTORY, 'run', 'codex', '--no-version-check', '--silent']);
      expect(argv).toHaveLength(c + 2);
      expect(argv[c + 1]).toContain('-c tui.fullscreen_transcript=false');
      expect(unwrapArgv(argv)).toEqual(inner);
    }
  });

  it('commandRunsAgent still reads a captured codex carrying the pair as codex', () => {
    // What `ps` prints for a captured codex under Phase 12.7 F3's bare name:
    // the quoting is gone, so the pair's own `-c` is a token too.
    const create = `${SPECSTORY} run codex --no-version-check --silent -c codex -c tui.fullscreen_transcript=false --yolo`;
    const resume = `${SPECSTORY} run codex --no-version-check --silent -c codex resume ${ID} -c tui.fullscreen_transcript=false --yolo`;
    for (const line of [create, resume]) {
      expect(commandRunsAgent(line, ['codex'], []), line).toBe(true);
      expect(commandRunsAgent(line, ['claude'], []), line).toBe(false);
    }
    // And uncaptured, the program token is still the agent.
    expect(commandRunsAgent('codex -c tui.fullscreen_transcript=false --yolo', ['codex'], [])).toBe(
      true
    );
  });
});

describe('every other agent', () => {
  it('every other agent\'s own flags are what they were', () => {
    const argvs: Record<string, string[]> = {
      claude: [
        '/abs/claude',
        '--settings',
        '/u/gmux/hooks/claude/p331-row.json',
        '--session-id',
        ID,
        '--model',
        'opus'
      ],
      cursor: ['/abs/cursor-agent', '--resume', ID, '--force'],
      deepseek: ['/abs/codewhale', '--skip-onboarding'],
      shell: ['/bin/zsh', '-l', '-c', 'echo p331']
    };
    for (const id of [...LAUNCHABLE_AGENT_IDS, 'shell']) {
      if (id === 'codex') continue;
      // Every one of them, with the pair itself in the flags: only codex
      // fixes tokens, so no other agent may ever have them set aside.
      const argv = argvs[id] ?? [`/abs/${id}`, ...PAIR, '--p331-own'];
      expect(ownLaunchFlags(id, argv), id).toEqual(argv.slice(1));
      expect(agentExtrasOf(row(id, argv)), id).toEqual(argv.slice(1));
    }
    // An agent the registry has never heard of is read the old way too.
    expect(ownLaunchFlags('not-an-agent', ['/x', ...PAIR])).toEqual([...PAIR]);
    expect([...CODEX_SCROLLBACK_ARGS]).toEqual(PAIR);
  });
});
