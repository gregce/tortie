/**
 * Rebuilding a lost manifest from capsules and tmux stamps (Phase 20 item 5).
 *
 * These run against a real filesystem and a real SQLite file in a temporary
 * directory. The capsule files are written by the module that owns them, so
 * the test reads the same bytes a real capture leaves behind rather than a
 * shape this test invented. tmux is the one thing that is faked, because the
 * whole point of the injected surface is that this never needs a server.
 *
 * What is pinned here.
 *  - A live session carrying NO identity is never written, never named as a
 *    candidate, and is reported as untouched. There is no decision that
 *    changes that.
 *  - Nothing is written without the acknowledgement, without a plan the survey
 *    issued, or twice from one plan.
 *  - The output never lands on the live manifest or in its directory, and
 *    never overwrites a file.
 *  - A capsule with a full recipe rebuilds a row that reads back field for
 *    field, with `running` for a live session and `restorable` for a dead one.
 *  - A session with no recipe is refused until a person supplies the missing
 *    facts, and is then written with the assumption recorded.
 *  - tmux is only ever read.
 */

import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Types only. The values come from the dynamic import below, after the mocks.
import type {
  CandidateDecision,
  ReconstructionConsent,
  ReconstructionPlan,
  ReconstructionTmux
} from '../reconstruct';

let userData = '';
let paneText = '';
/** Every tmux argv this test's fake server saw. The read only proof. */
let tmuxCalls: string[][] = [];

vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

vi.mock('../../settings/store', () => ({
  getSettings: () => ({ savedScrollbackLines: 10_000 })
}));

vi.mock('../../tmux', () => ({
  resolvePaneTarget: (target: string) => Promise.resolve(target),
  capturePane: () => Promise.resolve(paneText),
  execTmux: (args: readonly string[]) => {
    tmuxCalls.push([...args]);
    return Promise.resolve('');
  },
  listSessions: () => Promise.resolve([]),
  getSessionEnv: () => Promise.resolve(null),
  sanitizeSessionName: (name: string) => name.replace(/[.:/]/g, '-')
}));

const { captureSessionSnapshot, snapshotsDir } = await import(
  '../../restore/snapshots'
);
const {
  RECONSTRUCTION_ACKNOWLEDGEMENT,
  RECONSTRUCTION_BODY_NAME,
  applyReconstruction,
  defaultReconstructionRoot,
  summarizePlan,
  surveyReconstruction
} = await import('../reconstruct');
const { ManifestStore, defaultManifestDbPath } = await import('../store');

const ALIVE = '11111111-1111-4111-8111-111111111111';
const DEAD = '22222222-2222-4222-8222-222222222222';
const BARE = '33333333-3333-4333-8333-333333333333';

let root = '';

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-reconstruct-'));
  userData = join(root, 'profile');
  mkdirSync(join(userData, 'gmux'), { recursive: true });
  paneText = 'hello from the pane\n';
  tmuxCalls = [];
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface FakeSession {
  sessionId: string;
  tmuxName: string;
  createdAt: number;
  gmuxId?: string;
  /** Returned by `show-environment` when the option is absent. */
  paneEnvId?: string;
}

/**
 * A tmux that can only be read.
 *
 * It has exactly the two methods the module declares. Anything else it might
 * have been asked to do would be a compile error at the call site, and the
 * `tmuxCalls` log catches a write that went around the interface through the
 * mocked barrel.
 */
function fakeTmux(sessions: FakeSession[]): ReconstructionTmux {
  return {
    listSessions: () =>
      Promise.resolve(
        sessions.map((s) => ({
          sessionId: s.sessionId,
          tmuxName: s.tmuxName,
          createdAt: s.createdAt,
          attached: false,
          windows: 1,
          ...(s.gmuxId !== undefined ? { gmuxId: s.gmuxId } : {})
        }))
      ),
    getSessionEnv: (target, name) => {
      const found = sessions.find((s) => s.sessionId === target);
      if (name !== 'GMUX_SESSION_ID') return Promise.resolve(null);
      return Promise.resolve(found?.paneEnvId ?? null);
    }
  };
}

/** Write a real capsule for `sessionId`, through the module that owns them. */
async function capture(
  sessionId: string,
  recipe: {
    name: string;
    agent: string;
    projectPath: string;
    cwd: string;
    argv: string[];
    resumeArgv?: string[];
    agentSessionId?: string;
  } | null
): Promise<void> {
  mkdirSync(snapshotsDir(), { recursive: true });
  await captureSessionSnapshot('$0', sessionId, {
    reason: 'app-quit',
    cwd: recipe?.cwd ?? '/tmp',
    ...(recipe === null
      ? {}
      : {
          session: {
            name: recipe.name,
            tmuxName: recipe.name,
            projectPath: recipe.projectPath,
            cwd: recipe.cwd,
            agent: recipe.agent,
            agentSessionId: recipe.agentSessionId ?? null,
            argv: recipe.argv,
            resumeArgv: recipe.resumeArgv ?? null,
            agentVersion: null,
            specstoryVersion: null
          }
        })
  });
}

const consent = (
  outputRoot: string,
  decisions: Record<string, CandidateDecision> = {}
): ReconstructionConsent => ({
  acknowledgement: RECONSTRUCTION_ACKNOWLEDGEMENT,
  decidedBy: 'the test',
  outputRoot,
  decisions
});

function outRoot(name = 'rebuild'): string {
  return join(root, 'out', name);
}

// ---------------------------------------------------------------------------

describe('the identity rule', () => {
  it('never makes a candidate out of a session carrying no stamp', async () => {
    await capture(ALIVE, {
      name: 'alive',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$1', tmuxName: 'alive', createdAt: 1000, gmuxId: ALIVE },
        { sessionId: '$2', tmuxName: 'someone-elses-work', createdAt: 2000 }
      ])
    });

    expect(plan.candidates.map((c) => c.sessionId)).toEqual([ALIVE]);
    expect(plan.foreign).toEqual([
      { tmuxId: '$2', tmuxName: 'someone-elses-work' }
    ]);
  });

  it('leaves a foreign session out even when a decision names its tmux id', async () => {
    await capture(ALIVE, {
      name: 'alive',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$1', tmuxName: 'alive', createdAt: 1000, gmuxId: ALIVE },
        { sessionId: '$2', tmuxName: 'someone-elses-work', createdAt: 2000 }
      ])
    });
    // The only key a decision has is a session id, and a foreign session has
    // none. Naming its tmux id cannot reach anything.
    const result = await applyReconstruction(
      plan,
      consent(outRoot(), { $2: { include: true } })
    );

    expect(result.written).toEqual([ALIVE]);
    expect(result.foreignUntouched).toEqual([
      { tmuxId: '$2', tmuxName: 'someone-elses-work' }
    ]);
    const store = new ManifestStore(result.manifestPath);
    expect(store.listSessions().map((r) => r.tmuxName)).toEqual(['alive']);
    store.close();
  });

  it('accepts the pane environment stamp as identity', async () => {
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$5', tmuxName: 'stamped', createdAt: 3000, paneEnvId: BARE }
      ])
    });
    expect(plan.candidates).toHaveLength(1);
    expect(plan.candidates[0]?.sessionId).toBe(BARE);
    expect(plan.candidates[0]?.identity).toEqual(['pane-env']);
    expect(plan.foreign).toEqual([]);
  });
});

describe('the refusals before anything is written', () => {
  it('refuses without the acknowledgement', async () => {
    await capture(ALIVE, {
      name: 'alive',
      agent: 'shell',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/bin/zsh']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    await expect(
      applyReconstruction(plan, {
        acknowledgement: 'yes please' as typeof RECONSTRUCTION_ACKNOWLEDGEMENT,
        decidedBy: 'the test',
        outputRoot: outRoot()
      })
    ).rejects.toThrow(/explicit decision/);
    expect(existsSync(join(outRoot(), RECONSTRUCTION_BODY_NAME))).toBe(false);
  });

  /**
   * The output name must not end in `.db`, and this is not cosmetic.
   *
   * `migrate/userdata.ts` walks the whole profile and treats every `*.db` as a
   * database to copy with `VACUUM INTO`. The default output root is inside the
   * profile. `recovery.ts` avoided the suffix for the ring bodies for exactly
   * this reason and wrote it in its header; reconstruction did not, and a
   * verifier found it one file away from the note explaining it.
   */
  it('never writes a file the profile migration would treat as a database', async () => {
    expect(RECONSTRUCTION_BODY_NAME.endsWith('.db')).toBe(false);
    await capture(ALIVE, {
      name: 'alive',
      agent: 'shell',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/bin/zsh']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    const result = await applyReconstruction(
      plan,
      consent(outRoot(), { [ALIVE]: { include: true } })
    );
    expect(result.manifestPath).toBe(join(outRoot(), RECONSTRUCTION_BODY_NAME));
    for (const name of readdirSync(outRoot())) {
      expect(name.endsWith('.db')).toBe(false);
    }
  });

  it('refuses a plan the survey did not issue, and refuses one twice', async () => {
    await capture(ALIVE, {
      name: 'alive',
      agent: 'shell',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/bin/zsh']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    const forged: ReconstructionPlan = { ...plan, token: 'made-up' };
    await expect(
      applyReconstruction(forged, consent(outRoot('forged')))
    ).rejects.toThrow(/did not come from surveyReconstruction/);

    await applyReconstruction(plan, consent(outRoot('first')));
    await expect(
      applyReconstruction(plan, consent(outRoot('second')))
    ).rejects.toThrow(/already been applied/);
  });

  it('refuses the live manifest and its directory, and refuses to overwrite', async () => {
    await capture(ALIVE, {
      name: 'alive',
      agent: 'shell',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/bin/zsh']
    });
    const liveDir = join(userData, 'gmux');
    // A real manifest, so the refusal is proved against a file that exists.
    new ManifestStore(defaultManifestDbPath()).close();
    const before = readFileSync(defaultManifestDbPath());

    const first = await surveyReconstruction({ tmux: fakeTmux([]) });
    await expect(
      applyReconstruction(first, consent(liveDir))
    ).rejects.toThrow(/live manifest/);

    const second = await surveyReconstruction({ tmux: fakeTmux([]) });
    await applyReconstruction(second, consent(outRoot('once')));
    const third = await surveyReconstruction({ tmux: fakeTmux([]) });
    await expect(
      applyReconstruction(third, consent(outRoot('once')))
    ).rejects.toThrow(/Refusing to overwrite/);

    expect(readFileSync(defaultManifestDbPath()).equals(before)).toBe(true);
  });

  it('does not spend the plan on a refused path', async () => {
    await capture(ALIVE, {
      name: 'alive',
      agent: 'shell',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/bin/zsh']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    await expect(
      applyReconstruction(plan, consent('relative/path'))
    ).rejects.toThrow(/absolute path/);
    // The same plan still works. A typed path is a typo, and making a person
    // survey and read the plan again over one teaches them to skim it.
    const result = await applyReconstruction(plan, consent(outRoot()));
    expect(result.written).toEqual([ALIVE]);
  });

  it('refuses a relative root', async () => {
    await capture(ALIVE, {
      name: 'alive',
      agent: 'shell',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/bin/zsh']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    await expect(
      applyReconstruction(plan, consent('relative/path'))
    ).rejects.toThrow(/absolute path/);
  });

  it('puts its default root outside the live manifest directory', () => {
    expect(defaultReconstructionRoot(new Date(0))).toBe(
      join(userData, 'gmux', 'reconstructions', 'rebuild-1970-01-01T00-00-00-000Z')
    );
  });
});

describe('rebuilding from capsules and stamps', () => {
  it('writes a row per session and reads every field back', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo/sub',
      argv: ['/usr/local/bin/claude', '--session-id', ALIVE],
      resumeArgv: ['/usr/local/bin/claude', '--resume', 'conv-1'],
      agentSessionId: 'conv-1'
    });
    await capture(DEAD, {
      name: 'agent two',
      agent: 'codex',
      projectPath: '/work/other',
      cwd: '/work/other',
      argv: ['/usr/local/bin/codex']
    });

    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$9', tmuxName: 'agent-one', createdAt: 4242, gmuxId: ALIVE }
      ])
    });
    expect(plan.candidates.every((c) => !c.decisionRequired)).toBe(true);

    const result = await applyReconstruction(plan, consent(outRoot()));
    expect(result.verified).toBe(true);
    expect(result.mismatches).toEqual([]);
    expect(result.written.sort()).toEqual([ALIVE, DEAD].sort());
    expect(result.projects.sort()).toEqual(['/work/other', '/work/repo']);

    const store = new ManifestStore(result.manifestPath);
    const alive = store.getSession(ALIVE);
    const dead = store.getSession(DEAD);
    store.close();

    expect(alive).toMatchObject({
      name: 'agent one',
      tmuxName: 'agent-one',
      projectPath: '/work/repo',
      cwd: '/work/repo/sub',
      agent: 'claude',
      status: 'running',
      createdAt: 4242,
      argv: ['/usr/local/bin/claude', '--session-id', ALIVE],
      resumeArgv: ['/usr/local/bin/claude', '--resume', 'conv-1'],
      resumeCapture: 'armed',
      agentSessionId: 'conv-1'
    });
    expect(dead).toMatchObject({
      name: 'agent two',
      status: 'restorable',
      agent: 'codex',
      resumeCapture: 'unavailable'
    });
  });

  it('records the report beside the manifest, with the gaps named', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    const result = await applyReconstruction(plan, consent(outRoot()));

    const report = JSON.parse(readFileSync(result.reportPath, 'utf8')) as {
      plan: { candidates: unknown[] };
      result: { gaps: string[]; digests: Record<string, string> };
    };
    expect(report.plan.candidates).toHaveLength(1);
    expect(report.result.gaps.join(' ')).toMatch(/environment/);
    expect(Object.keys(report.result.digests).sort()).toEqual([
      // Phase 21. `meta` carries the schema version and the minimum
      // compatible version, so it is a user table like the rest and the
      // digest covers it.
      'meta',
      'migrations',
      'projects',
      'restore_attempts',
      'sessions'
    ]);
  });

  it('reports what the capsules proved about the scrollback', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    expect(plan.candidates[0]?.capsules).toMatchObject({
      count: 1,
      newestGeneration: 1,
      reason: 'app-quit'
    });
    expect(plan.candidates[0]?.scrollback).toBe('verified');
  });

  it('counts a body no record describes without making a candidate of it', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    // A snapshot written before Phase 19. A file name and some text, and no
    // record anywhere that says whose it is.
    writeFileSync(join(snapshotsDir(), `${DEAD}.txt`), 'old scrollback\n');

    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    expect(plan.candidates.map((c) => c.sessionId)).toEqual([ALIVE]);
    expect(plan.unrecordedScrollback).toEqual([DEAD]);
    expect(summarizePlan(plan).join('\n')).toMatch(
      /1 sessions have scrollback on disk/
    );
  });

  it('says a live session\'s scrollback is unproven when it predates Phase 19', async () => {
    mkdirSync(snapshotsDir(), { recursive: true });
    writeFileSync(join(snapshotsDir(), `${BARE}.txt`), 'old scrollback\n');
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$4', tmuxName: 'bare', createdAt: 77, gmuxId: BARE }
      ])
    });
    expect(plan.candidates[0]?.scrollback).toBe('unproven');
    expect(plan.candidates[0]?.notes.join(' ')).toMatch(/nothing vouches/);
  });
});

describe('ambiguity gets a decision, never a guess', () => {
  it('refuses a session with no recipe until the facts are supplied', async () => {
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$4', tmuxName: 'bare', createdAt: 77, gmuxId: BARE }
      ])
    });
    const candidate = plan.candidates[0];
    expect(candidate?.decisionRequired).toBe(true);
    expect(candidate?.recipe).toBeNull();

    // Included with nothing supplied: refused, and the refusal names what is
    // missing rather than inventing it.
    await expect(
      applyReconstruction(plan, consent(outRoot('a'), { [BARE]: { include: true } }))
    ).rejects.toThrow(/nothing to reconstruct/);

    const second = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$4', tmuxName: 'bare', createdAt: 77, gmuxId: BARE }
      ])
    });
    const result = await applyReconstruction(
      second,
      consent(outRoot('b'), {
        [BARE]: {
          include: true,
          fill: { agent: 'shell', projectPath: '/work/x', cwd: '/work/x' }
        }
      })
    );
    expect(result.written).toEqual([BARE]);
    expect(result.assumptions.join(' ')).toMatch(/no launch command/);

    const store = new ManifestStore(result.manifestPath);
    expect(store.getSession(BARE)).toMatchObject({
      name: 'bare',
      status: 'running',
      agent: 'shell',
      argv: [],
      resumeCapture: 'none'
    });
    store.close();
  });

  it('leaves a candidate needing a decision out when nobody decided', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$4', tmuxName: 'bare', createdAt: 77, gmuxId: BARE }
      ])
    });
    const result = await applyReconstruction(plan, consent(outRoot()));
    expect(result.written).toEqual([ALIVE]);
    expect(result.excluded).toEqual([BARE]);
  });

  it('needs a decision when two live sessions carry one identity', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$1', tmuxName: 'one', createdAt: 10, gmuxId: ALIVE },
        { sessionId: '$2', tmuxName: 'one-again', createdAt: 20, gmuxId: ALIVE }
      ])
    });
    expect(plan.candidates[0]?.decisionRequired).toBe(true);
    expect(plan.candidates[0]?.notes.join(' ')).toMatch(/2 live tmux sessions/);

    await expect(
      applyReconstruction(plan, consent(outRoot('none')))
    ).rejects.toThrow(/nothing to reconstruct/);
  });

  it('drops a session a person excluded', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    await capture(DEAD, {
      name: 'agent two',
      agent: 'codex',
      projectPath: '/work/other',
      cwd: '/work/other',
      argv: ['/usr/local/bin/codex']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    const result = await applyReconstruction(
      plan,
      consent(outRoot(), { [DEAD]: { include: false } })
    );
    expect(result.written).toEqual([ALIVE]);
    expect(result.excluded).toEqual([DEAD]);
  });
});

describe('what the survey says out loud', () => {
  it('reads back as lines naming the foreign sessions it left alone', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$1', tmuxName: 'agent-one', createdAt: 10, gmuxId: ALIVE },
        { sessionId: '$8', tmuxName: 'not-ours', createdAt: 20 }
      ])
    });
    const text = summarizePlan(plan).join('\n');
    expect(text).toMatch(/not ours, untouched: \$8 not-ours/);
    expect(text).toMatch(/agent claude/);
  });

  it('says so when tmux does not answer', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({
      tmux: {
        listSessions: () => Promise.reject(new Error('no server')),
        getSessionEnv: () => Promise.resolve(null)
      }
    });
    expect(plan.tmuxReachable).toBe(false);
    expect(plan.candidates).toHaveLength(1);
    expect(plan.candidates[0]?.live).toEqual([]);
  });
});

describe('tmux is only ever read', () => {
  it('sends no tmux command through the barrel during a whole run', async () => {
    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    // The capture above is the only thing allowed to have run tmux. Clear the
    // log, then prove the survey and the rebuild add nothing to it.
    tmuxCalls = [];
    const plan = await surveyReconstruction({
      tmux: fakeTmux([
        { sessionId: '$1', tmuxName: 'agent-one', createdAt: 10, gmuxId: ALIVE }
      ])
    });
    await applyReconstruction(plan, consent(outRoot()));
    expect(tmuxCalls).toEqual([]);
  });
});

describe('the live manifest', () => {
  it('is counted read only and is not modified', async () => {
    const store = new ManifestStore(defaultManifestDbPath());
    store.insertSession({
      id: 'existing',
      name: 'existing',
      tmuxName: 'existing',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      agent: 'shell',
      status: 'running',
      createdAt: 1,
      argv: ['/bin/zsh'],
      lastSeen: 1
    });
    store.close();
    const before = readFileSync(defaultManifestDbPath());

    await capture(ALIVE, {
      name: 'agent one',
      agent: 'claude',
      projectPath: '/work/repo',
      cwd: '/work/repo',
      argv: ['/usr/local/bin/claude']
    });
    const plan = await surveyReconstruction({ tmux: fakeTmux([]) });
    expect(plan.liveManifestSessions).toBe(1);
    await applyReconstruction(plan, consent(outRoot()));

    expect(readFileSync(defaultManifestDbPath()).equals(before)).toBe(true);
  });
});
