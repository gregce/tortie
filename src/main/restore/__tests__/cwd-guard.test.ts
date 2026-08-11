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
vi.mock('../snapshots', () => ({ existingSnapshotPath: () => null }));

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

describe('restoreSessionInTmux — original-cwd guard', () => {
  it('refuses to substitute the project folder for an armed pi session', async () => {
    await expect(
      restoreSessionInTmux(
        rec({ resumeArgv: ['/abs/pi', '--session-id', 'ID'] })
      )
    ).rejects.toThrow(/original folder/);
    // The point of refusing: no pane that LOOKS resumed and is not.
    expect(createSession).not.toHaveBeenCalled();
  });

  it('says which folder is missing, so the message is actionable', async () => {
    await expect(
      restoreSessionInTmux(rec({ resumeArgv: ['/abs/pi', '--session-id', 'ID'] }))
    ).rejects.toThrow(new RegExp(gone.replace(/[/\\]/g, '.')));
  });

  it('qwen is guarded too — the registry decides, not a list in restore.ts', async () => {
    await expect(
      restoreSessionInTmux(
        rec({ agent: as('qwen'), name: 'qwen-1', resumeArgv: ['/abs/qwen', '--resume', 'ID'] })
      )
    ).rejects.toThrow(/original folder/);
  });

  it('claude still substitutes: its lookup is global, so nothing is lost', async () => {
    const out = await restoreSessionInTmux(
      rec({
        agent: as('claude'),
        name: 'claude-1',
        resumeArgv: ['/abs/claude', '--resume', 'ID']
      })
    );
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
    await expect(
      restoreSessionInTmux(
        rec({ projectPath: join(root, 'also-gone'), agent: as('shell') })
      )
    ).rejects.toThrow(/no longer exists/);
  });
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});
