/**
 * Phase 164. The title bar asks for ONE git status, the active project's, and
 * a hidden project is asked about when it is selected and not before.
 *
 * THE DEFECT THIS GUARDS AGAINST. The title bar's effect looped every open
 * local project and called `ensureStatus` on each, whenever the list changed.
 * Nothing on screen read a hidden project's answer, and each one cost three
 * git processes and a file watcher at boot, then a re-run on every change in
 * that folder for the whole run. Measured on the parent commit with five
 * projects open: four hidden statuses in the first two seconds, every launch.
 *
 * What these tests hold:
 *  - `activeLocalRepoPath` names the active project's folder and nothing
 *    else, null with no active project, null for a folder on another
 *    machine (the Phase 90.3 rule, kept);
 *  - driven the way the effect drives it, a boot with five projects asks the
 *    git store for exactly one status, switching asks for the newly active
 *    one, switching back asks for nothing, and the never selected projects
 *    are never asked about;
 *  - THE CHARTER PROOF: a status fetched for one folder is readable only
 *    under that folder's path. After a switch the newly active project reads
 *    the empty record until its own answer lands, never its neighbour's;
 *  - the title bar's source carries no loop over `projects` that calls
 *    `ensureStatus`, and its effect depends on `activeProjectId`.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GitStatusResult, Project } from '@shared/types';

const asked: string[] = [];

function statusFor(repoPath: string): GitStatusResult {
  return {
    isRepo: true,
    branch: repoPath.split('/').pop() ?? '',
    upstream: null,
    ahead: 0,
    behind: 0,
    files: [{ path: `${repoPath.split('/').pop() ?? ''}.txt`, x: '?', y: '?' }],
    detached: false
  } as unknown as GitStatusResult;
}

function installGlobals(): void {
  vi.stubGlobal('window', {
    addEventListener() {},
    removeEventListener() {},
    gmux: {
      git: {
        status: (repoPath: string) => {
          asked.push(repoPath);
          return Promise.resolve(statusFor(repoPath));
        }
      }
    }
  });
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem() {},
    removeItem() {}
  });
}

installGlobals();

const { useGit, repoState } = await import('../../state/git');
const { activeLocalRepoPath } = await import('../active-repo');

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const P = (n: number, machineId?: string): Project => ({
  id: `p${String(n)}`,
  name: `r${String(n)}`,
  path: `/scratch/p164/r${String(n)}`,
  ...(machineId === undefined ? {} : { machineId })
});
const FIVE = [P(1), P(2), P(3), P(4), P(5)];

/** What the title bar's effect does, without a DOM. */
function effect(projects: readonly Project[], activeProjectId: string | null): void {
  const local = activeLocalRepoPath(projects, activeProjectId);
  if (local !== null) useGit.getState().ensureStatus(local);
}

beforeEach(() => {
  asked.length = 0;
  useGit.setState({ repos: {} });
});

describe('activeLocalRepoPath', () => {
  it('is the active project folder and nothing else', () => {
    expect(activeLocalRepoPath(FIVE, 'p3')).toBe('/scratch/p164/r3');
  });
  it('is null with no active project or an unknown id', () => {
    expect(activeLocalRepoPath(FIVE, null)).toBeNull();
    expect(activeLocalRepoPath(FIVE, 'gone')).toBeNull();
    expect(activeLocalRepoPath([], 'p1')).toBeNull();
  });
  it('is null for a folder on another machine (Phase 90.3 kept)', () => {
    expect(activeLocalRepoPath([P(1, 'mac-pro')], 'p1')).toBeNull();
    expect(activeLocalRepoPath([P(1, 'local')], 'p1')).toBe('/scratch/p164/r1');
  });
});

describe('Phase 164: one status at boot, the rest on selection', () => {
  it('a boot with five projects asks for exactly one status', async () => {
    effect(FIVE, 'p1');
    await tick();
    expect(asked).toEqual(['/scratch/p164/r1']);
  });

  it('a switch asks for the newly active project, and only it', async () => {
    effect(FIVE, 'p1');
    await tick();
    effect(FIVE, 'p4');
    await tick();
    expect(asked).toEqual(['/scratch/p164/r1', '/scratch/p164/r4']);
    // Switching back is free, because the answer is already held.
    effect(FIVE, 'p1');
    await tick();
    expect(asked).toEqual(['/scratch/p164/r1', '/scratch/p164/r4']);
    // The list changing (a project added) re-fires the effect and asks
    // nothing new for the active one.
    effect([...FIVE, P(6)], 'p1');
    await tick();
    expect(asked).toHaveLength(2);
    // Never selected, never asked.
    expect(asked).not.toContain('/scratch/p164/r2');
    expect(asked).not.toContain('/scratch/p164/r3');
    expect(asked).not.toContain('/scratch/p164/r5');
  });

  it('CHARTER PROOF: a switch never shows another project status under the active identity', async () => {
    effect(FIVE, 'p1');
    await tick();
    const r1 = repoState(useGit.getState().repos, '/scratch/p164/r1');
    expect(r1.status?.files[0]?.path).toBe('r1.txt');
    // Switch to p2. Before its own answer lands, the active identity reads
    // the EMPTY record: no status, not r1's.
    effect(FIVE, 'p2');
    const before = repoState(useGit.getState().repos, activeLocalRepoPath(FIVE, 'p2'));
    expect(before.status).toBeNull();
    expect(before.loading).toBe(true);
    await tick();
    const after = repoState(useGit.getState().repos, activeLocalRepoPath(FIVE, 'p2'));
    expect(after.status?.branch).toBe('r2');
    expect(after.status?.files[0]?.path).toBe('r2.txt');
    // And r1's answer is still r1's, untouched by the switch.
    expect(repoState(useGit.getState().repos, '/scratch/p164/r1').status?.files[0]?.path).toBe('r1.txt');
    // A folder on another machine reads the empty record and asks nothing.
    effect([P(1, 'mac-pro')], 'p1');
    await tick();
    expect(repoState(useGit.getState().repos, null).status).toBeNull();
    expect(asked).toEqual(['/scratch/p164/r1', '/scratch/p164/r2']);
  });
});

describe('Phase 164: the title bar source', () => {
  const src = readFileSync(join(__dirname, '..', 'Titlebar.tsx'), 'utf8');
  it('carries no loop over projects that calls ensureStatus', () => {
    expect(src).not.toMatch(/for \(const p of projects\)[\s\S]{0,200}ensureStatus/);
  });
  it('asks through activeLocalRepoPath and re-fires on activeProjectId', () => {
    expect(src).toContain("import { activeLocalRepoPath } from './active-repo';");
    expect(src).toMatch(/activeLocalRepoPath\(projects, activeProjectId\)[\s\S]{0,120}\}, \[projects, activeProjectId, gitInit, ensureStatus\]\);/);
  });
});
