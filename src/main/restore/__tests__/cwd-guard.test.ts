/**
 * The cwd-substitution guard in restoreSessionInTmux (research 22 §3.5,
 * implemented in Phase 13.5.1).
 *
 * Restore has always fallen back `rec.cwd -> rec.projectPath` when the
 * recorded directory was gone. For claude and muse — global conversation
 * lookup — that is a kindness. For the cwd-scoped agents it is the exact
 * failure this phase exists to prevent: `pi --session-id <id>` run from the
 * wrong project does not error, it opens an EMPTY session under the same id,
 * so the pane looks resumed and the conversation is not there. qwen at least
 * fails loudly ("No saved session found with ID").
 *
 * tmux is mocked: this is about the decision, not the plumbing.
 *
 * PHASE 19 ITEM 6 CHANGED HOW THE REFUSAL ARRIVES. It used to be a thrown
 * `GmuxError` and it is now the `failed` arm of the returned union, carrying
 * that same error object. The assertions below check both halves: that the
 * refusal is reported, and that the error the caller would rethrow is the one
 * the renderer has always shown.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ManifestSessionRecord } from '../../manifest';

const createSession = vi.fn(async (opts: { cwd: string }) => ({
  sessionId: '$99',
  tmuxName: 'zz-restore-test',
  cwd: opts.cwd,
  panePid: 4242
}));

vi.mock('../../tmux', async () => {
  const errors =
    await vi.importActual<typeof import('../../tmux/errors')>('../../tmux/errors');
  return {
    ...errors,
    createSession: (opts: { cwd: string }) => createSession(opts),
    execTmux: vi.fn(async () => ''),
    managedPaneEnv: () => ({})
  };
});

// No Electron userData in a unit test; no snapshot means no replay.
vi.mock('../snapshots', () => ({ resolveSnapshot: () => null }));

import { restoreSessionInTmux } from '../restore';

let root: string;
let gone: string;

/** Sessions carry more agent ids at runtime than the frozen AgentKind union. */
const as = (id: string): ManifestSessionRecord['agent'] =>
  id as ManifestSessionRecord['agent'];

beforeEach(() => {
  createSession.mockClear();
  root = mkdtempSync(join(tmpdir(), 'gmux-restore-guard-'));
  gone = join(root, 'deleted-worktree');
});

function rec(over: Partial<ManifestSessionRecord>): ManifestSessionRecord {
  return {
    id: 'sess-1',
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

/** The failure arm, with a readable message when the call unexpectedly won. */
function failed(out: Awaited<ReturnType<typeof restoreSessionInTmux>>) {
  if (out.kind !== 'failed') {
    throw new Error(`expected a failed restore, got ${out.kind}`);
  }
  return out;
}

describe('restoreSessionInTmux — original-cwd guard', () => {
  it('refuses to substitute the project folder for an armed pi session', async () => {
    const out = failed(
      await restoreSessionInTmux(rec({ resumeArgv: ['/abs/pi', '--session-id', 'ID'] }))
    );
    expect(out.reason).toMatch(/original folder/);
    // Preflight, so the caller knows nothing was created and nothing needs
    // cleaning up. This is also what the restore journal records.
    expect(out.stage).toBe('preflight');
    // The point of refusing: no pane that LOOKS resumed and is not.
    expect(createSession).not.toHaveBeenCalled();
  });

  it('carries the original GmuxError, so the renderer sees what it always did', async () => {
    const out = failed(
      await restoreSessionInTmux(rec({ resumeArgv: ['/abs/pi', '--session-id', 'ID'] }))
    );
    const payload = JSON.parse((out.error as Error).message) as {
      code: string;
      message: string;
      detail?: string;
    };
    expect(payload.code).toBe('INVALID_INPUT');
    expect(payload.message).toMatch(/original folder/);
    expect(payload.detail).toBe(gone);
  });

  it('says which folder is missing, so the message is actionable', async () => {
    const out = failed(
      await restoreSessionInTmux(rec({ resumeArgv: ['/abs/pi', '--session-id', 'ID'] }))
    );
    expect(out.reason).toMatch(new RegExp(gone.replace(/[/\\]/g, '.')));
  });

  it('qwen is guarded too — the registry decides, not a list in restore.ts', async () => {
    const out = failed(
      await restoreSessionInTmux(
        rec({
          agent: as('qwen'),
          name: 'qwen-1',
          resumeArgv: ['/abs/qwen', '--resume', 'ID']
        })
      )
    );
    expect(out.reason).toMatch(/original folder/);
  });

  it('claude still substitutes: its lookup is global, so nothing is lost', async () => {
    const out = await restoreSessionInTmux(
      rec({
        agent: as('claude'),
        name: 'claude-1',
        resumeArgv: ['/abs/claude', '--resume', 'ID']
      })
    );
    if (out.kind === 'failed') throw new Error(`unexpected failure: ${out.reason}`);
    expect(out.info.tmuxName).toBe('zz-restore-test');
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: root })
    );
  });

  it('an UNARMED pi session still gets its folder back', async () => {
    // Nothing is typed into the pane, so there is no false resume to prevent
    // — refusing here would cost the user their scrollback for no safety.
    await restoreSessionInTmux(rec({}));
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: root })
    );
  });

  it('an intact cwd is never second-guessed', async () => {
    await restoreSessionInTmux(
      rec({ cwd: root, resumeArgv: ['/abs/pi', '--session-id', 'ID'] })
    );
    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: root })
    );
  });

  it('both folders gone → the original friendly error, unchanged', async () => {
    const out = failed(
      await restoreSessionInTmux(
        rec({ projectPath: join(root, 'also-gone'), agent: as('shell') })
      )
    );
    expect(out.reason).toMatch(/no longer exists/);
    expect((out.error as Error).message).toMatch(/no longer exists/);
    expect(createSession).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Phase 19 item 6. The stage results used to be a boolean and a nullable
  // string that the caller was free to ignore, and it did.
  // -----------------------------------------------------------------------

  it('a session with no snapshot reports shell_only with NO replay failure', async () => {
    // The mock has `resolveSnapshot` return null, so there was nothing
    // to replay. That is not a failure and must not be reported as one, or
    // every first restore of a young session would raise a false alarm.
    const out = await restoreSessionInTmux(rec({ cwd: root, agent: as('shell') }));
    expect(out.kind).toBe('shell_only');
    if (out.kind !== 'shell_only') return;
    expect(out.replayFailure).toBeUndefined();
    expect(out.armFailure).toBeUndefined();
  });

  it('a session with no snapshot but an armed resume reports armed', async () => {
    // The two stages are independent. There is no snapshot in this mock, so
    // nothing replayed, and the resume still armed perfectly. Reporting that
    // as `shell_only` would hide the one thing the user cares about most.
    const out = await restoreSessionInTmux(
      rec({
        cwd: root,
        agent: as('claude'),
        resumeArgv: ['/abs/claude', '--resume', 'ID']
      })
    );
    expect(out.kind).toBe('armed');
    if (out.kind !== 'armed') return;
    expect(out.armedCommand).toBe('/abs/claude --resume ID');
    // Nothing to replay is not a replay failure, so no alarm is raised.
    expect(out.replayFailure).toBeUndefined();
  });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});
