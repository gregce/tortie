/**
 * The recovery contract and the resume provenance — the write half of Phase 21
 * (A8 and G6, docs/research/33 §2.1).
 *
 * These tests exist for one sentence in the brief: **ambiguity produces weak or
 * unknown, never an exact claim.** Two sessions of one agent started in one
 * directory are separable only by timing, and until this phase both reached the
 * manifest as the same armed session with the same confident type. So the cases
 * below are adversarial on purpose: rivals in one folder, a record nothing ever
 * confirmed, a rescue with no live pane to correlate against.
 *
 * The contract half is tested against the agents whose registry rows are the
 * reason the defect matters. pi is the one that costs the user a conversation
 * silently, so it gets its own assertion rather than a shared loop.
 */

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildLaunchSpec,
  buildRecoveryContract,
  deriveResumeConfidence,
  harvestProvenance,
  launchProvenance,
  SESSION_CONTRACT_VERSION,
  type RecoveryContractInput
} from '../agents';
import { watchForSessionId, type HarvestedSessionId } from '../harvest';

let home = '';
let cwd = '';

/** Fast polling so a test does not wait on a 1 Hz clock. */
const FAST = { pollIntervalMs: 25, timeoutMs: 4_000, graceMs: 150 } as const;

function write(path: string, body: string): void {
  mkdirSync(join(path, '..'), { recursive: true });
  writeFileSync(path, body);
}

function jsonl(...records: unknown[]): string {
  return records.map((r) => `${JSON.stringify(r)}\n`).join('');
}

function input(over: Partial<RecoveryContractInput> = {}): RecoveryContractInput {
  return {
    bin: '/opt/homebrew/bin/claude',
    cwdReal: '/Users/someone/repo',
    projectReal: '/Users/someone/repo',
    agentVersion: '2.1.228 (Claude Code)',
    at: 1_700_000_000_000,
    ...over
  };
}

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'gmux-prov-home-'));
  cwd = mkdtempSync(join(tmpdir(), 'gmux-prov-cwd-'));
});

afterEach(() => {
  rmSync(home, { recursive: true, force: true });
  rmSync(cwd, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// The invariant, on its own
// ---------------------------------------------------------------------------

describe('deriveResumeConfidence — ambiguity never becomes an exact claim', () => {
  it('a lone record proved by an identity key is exact', () => {
    expect(
      deriveResumeConfidence({
        key: 'tmux-pane',
        keyConfidence: 'exact',
        viaGraceTimer: false,
        rivals: 1
      })
    ).toBe('exact');
  });

  it('a lone record proved by a directory key is exact', () => {
    expect(
      deriveResumeConfidence({
        key: 'cwd-newest',
        keyConfidence: 'exact',
        viaGraceTimer: false,
        rivals: 1
      })
    ).toBe('exact');
  });

  it('a directory key with a rival is weak — the tie was broken by time', () => {
    expect(
      deriveResumeConfidence({
        key: 'cwd-newest',
        keyConfidence: 'exact',
        viaGraceTimer: false,
        rivals: 2
      })
    ).toBe('weak');
  });

  it('an identity key with a rival stays exact — the pane cannot be two panes', () => {
    for (const key of ['tmux-pane', 'pid', 'fd-owner'] as const) {
      expect(
        deriveResumeConfidence({
          key,
          keyConfidence: 'exact',
          viaGraceTimer: false,
          rivals: 3
        })
      ).toBe('exact');
    }
  });

  it('a key the descriptor calls weak is weak however alone it is', () => {
    expect(
      deriveResumeConfidence({
        key: 'time-only',
        keyConfidence: 'weak',
        viaGraceTimer: false,
        rivals: 1
      })
    ).toBe('weak');
  });

  it('a grace-timer acceptance outranks every other reason', () => {
    // Nothing confirmed the record. The strongest key in the set does not
    // change that, and the answer must not read as a confirmation.
    expect(
      deriveResumeConfidence({
        key: 'tmux-pane',
        keyConfidence: 'exact',
        viaGraceTimer: true,
        rivals: 1
      })
    ).toBe('grace-accepted');
  });

  it('never returns exact for any input carrying doubt', () => {
    const keys = [
      'tmux-pane',
      'pid',
      'fd-owner',
      'cwd-newest',
      'sqlite-index',
      'time-only'
    ] as const;
    for (const key of keys) {
      for (const keyConfidence of ['exact', 'weak'] as const) {
        for (const viaGraceTimer of [true, false]) {
          for (const rivals of [1, 2, 5]) {
            const verdict = deriveResumeConfidence({
              key,
              keyConfidence,
              viaGraceTimer,
              rivals
            });
            const doubt =
              viaGraceTimer ||
              keyConfidence === 'weak' ||
              (rivals > 1 &&
                key !== 'tmux-pane' &&
                key !== 'pid' &&
                key !== 'fd-owner');
            if (doubt) expect(verdict).not.toBe('exact');
            else expect(verdict).toBe('exact');
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// The watcher now reports the evidence, not just the answer
// ---------------------------------------------------------------------------

describe('the harvest carries its own evidence', () => {
  const rollout = (uuid: string, stamp: string): string =>
    `rollout-${stamp}-${uuid}.jsonl`;

  it('two codex sessions in one directory both confirm, so the answer is weak', async () => {
    // THE CASE G6 IS NAMED FOR. codex proves a rollout by the cwd recorded on
    // line 1, and two sessions started in one folder both carry that folder.
    // Both confirm. The winner is the earliest record at or after the spawn,
    // which is a timing guess wearing a confirmed key.
    const earlier = 'aaaaaaaa-1111-4111-8111-111111111111';
    const later = 'bbbbbbbb-2222-4222-8222-222222222222';
    const dir = join(home, '.codex', 'sessions', '2099', '01', '01');
    write(join(dir, rollout(later, '2099-01-01T00-00-09')), jsonl({ payload: { cwd } }));
    write(join(dir, rollout(earlier, '2099-01-01T00-00-01')), jsonl({ payload: { cwd } }));

    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST }
    );
    const harvested = await watch.promise;
    expect(harvested.sessionId).toBe(earlier);
    expect(harvested.rivals).toBe(2);
    expect(harvested.storeRoot).toBe(join(home, '.codex', 'sessions'));
    // The descriptor still rates its own key 'exact'. What changed is the
    // claim made about THIS answer.
    expect(harvested.confidence).toBe('exact');
    expect(
      harvestProvenance(harvested, {
        cwd,
        agentVersion: null,
        atCreate: true
      }).confidence
    ).toBe('weak');
  });

  it('one codex session in that directory is exact, so this is not a blanket downgrade', async () => {
    const mine = 'cccccccc-3333-4333-8333-333333333333';
    const dir = join(home, '.codex', 'sessions', '2099', '01', '01');
    write(join(dir, rollout(mine, '2099-01-01T00-00-01')), jsonl({ payload: { cwd } }));

    const watch = watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST }
    );
    const harvested = await watch.promise;
    expect(harvested.rivals).toBe(1);
    expect(
      harvestProvenance(harvested, { cwd, agentVersion: null, atCreate: true })
        .confidence
    ).toBe('exact');
  });

  it('a rollout from another directory is not a rival at all', async () => {
    // A record the watcher RULED OUT must not degrade the answer. Only
    // candidates still in play count.
    const mine = 'dddddddd-4444-4444-8444-444444444444';
    const theirs = 'eeeeeeee-5555-4555-8555-555555555555';
    const dir = join(home, '.codex', 'sessions', '2099', '01', '01');
    write(
      join(dir, rollout(theirs, '2099-01-01T00-00-01')),
      jsonl({ payload: { cwd: '/somewhere/else' } })
    );
    write(join(dir, rollout(mine, '2099-01-01T00-00-02')), jsonl({ payload: { cwd } }));

    const harvested = await watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST }
    ).promise;
    expect(harvested.sessionId).toBe(mine);
    expect(harvested.rivals).toBe(1);
  });

  it('an unflushed rollout accepted on the timer is never exact', async () => {
    const uuid = 'ffffffff-6666-4666-8666-666666666666';
    const dir = join(home, '.codex', 'sessions', '2099', '01', '01');
    write(join(dir, rollout(uuid, '2099-01-01T00-00-01')), ''); // nothing to read

    const harvested = await watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST }
    ).promise;
    expect(harvested.viaGraceTimer).toBe(true);
    expect(
      harvestProvenance(harvested, { cwd, agentVersion: null, atCreate: true })
        .confidence
    ).toBe('grace-accepted');
  });

  it('the earliest record wins even when the directory enumerates the other one first', async () => {
    // The watcher used to settle on whichever candidate was considered first,
    // so its own "earliest record at or after the spawn" rule only held when
    // readdir happened to agree. Writing the LATER file first is the check.
    const early = 'aaaaaaaa-7777-4777-8777-777777777777';
    const late = 'bbbbbbbb-8888-4888-8888-888888888888';
    const dir = join(home, '.codex', 'sessions', '2099', '01', '01');
    write(join(dir, rollout(late, '2099-01-01T09-00-00')), jsonl({ payload: { cwd } }));
    write(join(dir, rollout(early, '2099-01-01T01-00-00')), jsonl({ payload: { cwd } }));

    const harvested = await watchForSessionId(
      'codex',
      { cwd, sinceTs: Date.now() - 500 },
      { home, ...FAST }
    ).promise;
    expect(harvested.sessionId).toBe(early);
  });
});

// ---------------------------------------------------------------------------
// Provenance built from a harvest
// ---------------------------------------------------------------------------

describe('harvestProvenance', () => {
  const harvested: HarvestedSessionId = {
    agent: 'codex',
    sessionId: 'aaaaaaaa-1111-4111-8111-111111111111',
    storePath: '/store/root/rollout.jsonl',
    storeRoot: '/store/root',
    key: 'cwd-newest',
    confidence: 'exact',
    viaGraceTimer: false,
    rivals: 1,
    acceptedAt: 1_700_000_000_500
  };

  it('keeps the raw evidence beside the derived claim', () => {
    const p = harvestProvenance(harvested, {
      cwd: '/repo',
      agentVersion: 'codex-cli 0.147.0',
      atCreate: true
    });
    expect(p).toMatchObject({
      v: SESSION_CONTRACT_VERSION,
      source: 'store-harvest',
      confidence: 'exact',
      key: 'cwd-newest',
      keyConfidence: 'exact',
      viaGraceTimer: false,
      rivals: 1,
      storePath: '/store/root/rollout.jsonl',
      storeRoot: '/store/root',
      cwd: '/repo',
      at: 1_700_000_000_500,
      agentVersion: 'codex-cli 0.147.0'
    });
  });

  it('a watch a later launch started is a boot rescue, permanently', () => {
    const p = harvestProvenance(harvested, {
      cwd: '/repo',
      agentVersion: null,
      atCreate: false
    });
    expect(p.source).toBe('boot-rescue');
    expect(p.agentVersion).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Provenance built at launch
// ---------------------------------------------------------------------------

describe('launchProvenance', () => {
  it('an id Tortie generated is exact, because nothing else could be right', () => {
    const spec = buildLaunchSpec('claude', [], '/opt/homebrew/bin/claude');
    const p = launchProvenance(spec, {
      cwd: '/repo',
      at: 1,
      agentVersion: '2.1.228 (Claude Code)'
    });
    expect(p).toMatchObject({ source: 'preassigned', confidence: 'exact' });
  });

  it('a pre-assign command that produced nothing makes no claim', () => {
    // buildLaunchSpec leaves cursor at 'preassigned-cmd' with no id; that is
    // the shape a create-chat failure leaves behind too.
    const spec = buildLaunchSpec('cursor', [], '/opt/homebrew/bin/cursor-agent');
    expect(spec.idCapture).toBe('preassigned-cmd');
    expect(spec.agentSessionId).toBeUndefined();
    const p = launchProvenance(spec, { cwd: '/repo', at: 1, agentVersion: null });
    expect(p).toMatchObject({ source: 'unavailable', confidence: 'none' });
  });

  it('a pre-assign command that produced an id is exact', () => {
    const spec = buildLaunchSpec('cursor', [], '/opt/homebrew/bin/cursor-agent');
    spec.agentSessionId = 'chat-abc';
    const p = launchProvenance(spec, { cwd: '/repo', at: 1, agentVersion: null });
    expect(p).toMatchObject({ source: 'preassign-command', confidence: 'exact' });
  });

  it('a harvesting agent records the route and claims nothing yet', () => {
    const spec = buildLaunchSpec('codex', [], '/opt/homebrew/bin/codex');
    const p = launchProvenance(spec, { cwd: '/repo', at: 1, agentVersion: null });
    expect(p).toMatchObject({
      source: 'store-harvest',
      confidence: 'none',
      key: 'cwd-newest',
      keyConfidence: 'exact'
    });
  });

  it('a plain shell says there is no conversation id, not that one is unknown', () => {
    const spec = buildLaunchSpec('shell', [], '/bin/zsh');
    const p = launchProvenance(spec, { cwd: '/repo', at: 1, agentVersion: null });
    expect(p).toMatchObject({ source: 'none', confidence: 'none' });
  });
});

// ---------------------------------------------------------------------------
// The recovery contract
// ---------------------------------------------------------------------------

describe('buildRecoveryContract', () => {
  it('records requiresOriginalCwd true for pi — the field the defect is named for', () => {
    // pi resumes into a SILENT new empty session when the directory is
    // substituted, so a restore that reads `false` for it hands the user an
    // empty pane that looks resumed.
    const c = buildRecoveryContract('pi', input({ bin: '/opt/homebrew/bin/pi' }));
    expect(c.requiresOriginalCwd).toBe(true);
  });

  it('records requiresOriginalCwd true for qwen and false for claude', () => {
    expect(buildRecoveryContract('qwen', input()).requiresOriginalCwd).toBe(true);
    expect(buildRecoveryContract('claude', input()).requiresOriginalCwd).toBe(false);
  });

  it('records the registry facts a composed resume needs to be right', () => {
    // deepseek's options must precede its subcommand. The wrong position is a
    // dead pane, so the position travels with the row.
    const c = buildRecoveryContract('deepseek', input({ bin: '/usr/local/bin/deepseek' }));
    expect(c.resumeExtrasPosition).toBe('leading');
    expect(c.resumeStrategy).toBe('flag-uuid');
    expect(c.resumeTemplate.length).toBeGreaterThan(0);
    expect(c.sessionStore.length).toBeGreaterThan(0);
  });

  it('records that a bare resume is dangerous for gemini', () => {
    expect(buildRecoveryContract('gemini', input()).bareResumeIsDangerous).toBe(true);
    expect(buildRecoveryContract('claude', input()).bareResumeIsDangerous).toBe(false);
  });

  it('carries the launch capture mode when a spec is supplied', () => {
    const spec = buildLaunchSpec('claude', [], '/opt/homebrew/bin/claude');
    expect(buildRecoveryContract('claude', input(), spec).idCapture).toBe(
      'preassigned'
    );
    expect(buildRecoveryContract('codex', input()).idCapture).toBe('unsupported');
  });

  it('says whether the flag catalogue was read against the build that launched', () => {
    const verified = buildRecoveryContract(
      'claude',
      input({ agentVersion: '2.1.226 (Claude Code)' })
    );
    expect(verified.flagsVerifiedVersion).toBe('2.1.226 (Claude Code)');
    expect(verified.flagsVerifiedAgainst).toBe('this-version');

    // Five of nine installed agents drifted in three days, so this is the
    // ordinary case and it is information rather than an error.
    expect(
      buildRecoveryContract('claude', input({ agentVersion: '2.1.228 (Claude Code)' }))
        .flagsVerifiedAgainst
    ).toBe('other-version');

    expect(
      buildRecoveryContract('claude', input({ agentVersion: null }))
        .flagsVerifiedAgainst
    ).toBe('unknown');
  });

  it('says never for an agent no catalogue was ever verified against', () => {
    // droid is not installed on any machine Tortie has run on.
    const c = buildRecoveryContract('droid', input({ bin: '/nowhere/droid' }));
    expect(c.flagsVerifiedVersion).toBeNull();
    expect(c.flagsVerifiedAgainst).toBe('never');
    expect(c.captureRouteVerified).toBe(false);
  });

  it('marks a verified capture route as verified', () => {
    expect(buildRecoveryContract('claude', input()).captureRouteVerified).toBe(true);
  });

  it('records the resolved paths, because the store key is the resolved cwd', () => {
    const c = buildRecoveryContract(
      'claude',
      input({ cwdReal: '/private/tmp/work', projectReal: '/private/tmp' })
    );
    expect(c.cwdReal).toBe('/private/tmp/work');
    expect(c.projectReal).toBe('/private/tmp');
  });

  it('gives a plain shell a contract too, so no reader falls back to code', () => {
    const c = buildRecoveryContract('shell', input({ bin: '/bin/zsh' }));
    expect(c).toMatchObject({
      v: SESSION_CONTRACT_VERSION,
      requiresOriginalCwd: false,
      bareResumeIsDangerous: false,
      resumeStrategy: 'none',
      idCapture: 'none'
    });
  });

  it('stamps the shape version on every contract', () => {
    for (const agent of ['claude', 'codex', 'pi', 'shell'] as const) {
      expect(buildRecoveryContract(agent, input()).v).toBe(SESSION_CONTRACT_VERSION);
    }
  });
});
