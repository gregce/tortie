/**
 * Phase 374, the session core's three lines (build/p374/SPEC.md D11, D26, §4.2):
 * the boot sweep above the hooks' early return, a removed session's file, and
 * the reaper's two facts reaching the launch guard before its first await, and
 * only for a death Tortie did not ask for.
 *
 * The REAL bodies off `GmuxCore.prototype` over a small host; the folder is real,
 * in a temporary userData. No tmux, no agent, nothing under a home.
 */

import { existsSync, mkdirSync, mkdtempSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const world = vi.hoisted(() => ({ userData: '', on: true }));
const root = realpathSync(mkdtempSync(join(tmpdir(), 'tortie-p374-core-')));
world.userData = root;

vi.mock('electron', () => ({
  app: { isReady: () => true, isPackaged: false, getPath: () => world.userData, getAppPath: () => process.cwd(), getVersion: () => '0.0.0-p374', on: () => undefined },
  BrowserWindow: { getAllWindows: () => [] },
  ipcMain: { handle: () => undefined, on: () => undefined }
}));
vi.mock('../../settings/store', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../settings/store')>()),
  getSettings: () => ({ usage: { claude: false, codex: false, antigravity: world.on, bar: 'five' } })
}));
const noted: Array<[string, unknown, unknown]> = [];
vi.mock('../../usage/antigravity/launch', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../usage/antigravity/launch')>()),
  noteAntigravityDeath: (id: string, code: unknown, signal: unknown) => void noted.push([id, code, signal])
}));

const { GmuxCore } = await import('../core');
const { antigravityUsageDir, listAntigravityFiles, openAntigravitySlot, resetAntigravityFolderForTests } = await import('../../usage/antigravity/folder');

type Body = (this: unknown, ...args: unknown[]) => unknown;
const body = (name: string): Body => (GmuxCore.prototype as unknown as Record<string, Body>)[name] as Body;

const A = 'aaaaaaaa-1111-4111-8111-111111111111';
const B = 'bbbbbbbb-2222-4222-8222-222222222222';
const C = 'cccccccc-3333-4333-8333-333333333333';

beforeEach(() => {
  vi.stubEnv('GMUX_DISABLE_AGENT_HOOKS', '1');
  rmSync(join(root, 'gmux'), { recursive: true, force: true });
  mkdirSync(join(root, 'gmux'));
  world.on = true;
  noted.length = 0;
  resetAntigravityFolderForTests();
});
afterEach(() => vi.unstubAllEnvs());
afterAll(() => rmSync(root, { recursive: true, force: true }));

const names = (): string[] => (existsSync(antigravityUsageDir()) ? readdirSync(antigravityUsageDir()).sort() : []);

describe('the boot', () => {
  const boot = (rows: Array<{ id: string; status: string }>): unknown => body('startHookChannel').call({ manifest: { listSessions: () => rows } });

  it('sweeps with the hooks off too, keeps every row a person has and drops a removed one', async () => {
    for (const id of [A, B, C]) openAntigravitySlot(id);
    writeFileSync(join(antigravityUsageDir(), `${A}.json.7.tmp`), 'x');
    const rows = [{ id: A, status: 'running' }, { id: B, status: 'exited' }, { id: C, status: 'discarded' }];
    await boot(rows);
    expect(names()).toEqual([`${A}.json`, `${B}.json`, 'status.sh'].sort());
    expect(listAntigravityFiles().map((f) => f.id).sort()).toEqual([A, B]);
    // A row removed later is unknown at the next listing, with no second boot.
    rows[0] = { id: A, status: 'discarded' };
    expect(listAntigravityFiles().map((f) => f.id)).toEqual([B]);
  });

  it('with the switch off removes what Tortie put there', async () => {
    openAntigravitySlot(A);
    world.on = false;
    await boot([{ id: A, status: 'running' }]);
    expect(names()).toEqual([]);
    expect(existsSync(antigravityUsageDir())).toBe(false);
  });
});

describe('a removed session', () => {
  it('takes its file with it, through the one cleanup both removals share', () => {
    openAntigravitySlot(A);
    openAntigravitySlot(B);
    const none = { get: () => undefined, delete: () => undefined, forget: () => undefined, revoke: () => undefined };
    body('releaseSessionResources').call({ liveIds: none, byTmuxId: none, activity: none, resumeInPlace: none, hookServer: none }, A);
    expect(names()).toEqual([`${B}.json`, 'status.sh'].sort());
  });
});

describe('a death', () => {
  const host = (status: string | null, order: string[]): unknown => ({
    manifest: {
      getSession: () => (status === null ? undefined : { id: A, name: 'one', agent: 'antigravity', status, argv: [] }),
      updateSession: () => undefined
    },
    attachHost: { detach: () => order.push('detach') },
    liveIds: new Map(),
    byTmuxId: new Map(),
    queueCaptureSync: () => undefined
  });

  it('reaches the guard with the reaper’s own two facts, before anything else it does', async () => {
    const order: string[] = [];
    const ran = body('reapDeadSession').call(host('running', order), A, 1, undefined) as Promise<unknown>;
    expect(noted).toEqual([[A, 1, undefined]]);
    await ran.catch(() => undefined);
    expect(order).toEqual(['detach']);
    await (body('reapDeadSession').call(host('idle', []), A, undefined, 'SIGHUP') as Promise<unknown>).catch(() => undefined);
    expect(noted[1]).toEqual([A, undefined, 'SIGHUP']);
  });

  it('that Tortie asked for, or of a session it does not hold, does not', async () => {
    for (const status of ['exited', null]) await body('reapDeadSession').call(host(status, []), A, 1, undefined);
    expect(noted).toEqual([]);
  });
});
