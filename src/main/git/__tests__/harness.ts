/**
 * Shared harness for the GitService integration suites: run the REAL system
 * git in throwaway repos under os.tmpdir(), isolated from the developer's
 * global/system git config (signing, hooks, templates) via
 * GIT_CONFIG_GLOBAL/SYSTEM. Extracted from the three sibling suites by the
 * Phase-10 integrator dup-scan (standing guardrail 4).
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll } from 'vitest';

const ENV_ISOLATION = {
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_SYSTEM: '/dev/null'
} as const;

/** Run git in `cwd` with the isolated config env; returns stdout. */
export function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...ENV_ISOLATION }
  });
}

/** Fresh repo on `main` with the test identity; caller owns cleanup. */
export function makeRepo(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  git(dir, 'init', '-b', 'main');
  git(dir, 'config', 'user.name', 'gmux test');
  git(dir, 'config', 'user.email', 'test@gmux.local');
  git(dir, 'config', 'commit.gpgsign', 'false');
  return dir;
}

/**
 * GitService's runGit inherits process.env — isolate it the same way for
 * the suite's lifetime. Call once at module scope of each test file.
 */
export function isolateGitConfig(): void {
  let savedGlobal: string | undefined;
  let savedSystem: string | undefined;

  beforeAll(() => {
    savedGlobal = process.env['GIT_CONFIG_GLOBAL'];
    savedSystem = process.env['GIT_CONFIG_SYSTEM'];
    process.env['GIT_CONFIG_GLOBAL'] = '/dev/null';
    process.env['GIT_CONFIG_SYSTEM'] = '/dev/null';
  });

  afterAll(() => {
    if (savedGlobal === undefined) delete process.env['GIT_CONFIG_GLOBAL'];
    else process.env['GIT_CONFIG_GLOBAL'] = savedGlobal;
    if (savedSystem === undefined) delete process.env['GIT_CONFIG_SYSTEM'];
    else process.env['GIT_CONFIG_SYSTEM'] = savedSystem;
  });
}
