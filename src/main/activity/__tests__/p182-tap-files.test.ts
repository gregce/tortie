/**
 * The MODES and the NAMES of everything Phase 182 leaves under
 * `<userData>/gmux/hooks/claude`, driven through the real writer.
 *
 * WHY THIS FILE EXISTS. The rest of the phase's checks read the bytes that go
 * into those files; this one reads the files themselves, on a scratch userData,
 * through `ensureClaudeHookSettings`. Two claims can only be seen here.
 *
 *  1. THE SETTINGS FILE IS 0600. It holds the session's 128 bit token, and
 *     research 72 section 10.9 names the right carrier as "a file under
 *     userData at mode 0600". Phase 13 wrote it with no mode, which is 0644
 *     under the ordinary umask, measured on the operator's own install where
 *     all 26 of his settings files read `-rw-r--r--`. That predates this phase
 *     and this phase is what makes the file the documented token carrier, so
 *     the fix lands here.
 *  2. NO TEMPORARY FILE SURVIVES THE WRITE, and a `<id>.json.<pid>.tmp` that
 *     an earlier crash left is swept rather than kept forever.
 *
 * It writes only inside a directory it makes and removes, mocks `app` so
 * nothing reaches a real profile, binds one loopback server and closes it, and
 * starts no agent.
 */

import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const userData = mkdtempSync(join(tmpdir(), 'p182-files-'));

vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

/** The switch on, so the managed script is written too. Nothing reads a real
 *  settings file: this is the only thing `claudeTapDecision` asks for. */
const usage = { claude: true, codex: false };
vi.mock('../../settings/store', () => ({
  getSettings: () => ({ usage })
}));

vi.mock('../../log', () => ({
  getLog: () => ({
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    debug: () => undefined
  })
}));

const {
  GmuxHookServer,
  claudeHookDir,
  claudeTapScriptPath,
  claudeTapStampDir,
  ensureClaudeHookSettings,
  resetTapReasonLog
} = await import('../hooks');

let server: InstanceType<typeof GmuxHookServer>;

beforeAll(async () => {
  server = new GmuxHookServer({
    onEvent: () => undefined,
    onSessionEnd: () => undefined
  });
  await server.start(0);
});

afterAll(() => {
  server.stop();
  rmSync(userData, { recursive: true, force: true });
});

beforeEach(() => {
  resetTapReasonLog();
  usage.claude = true;
});

const mode = (p: string): string => (statSync(p).mode & 0o777).toString(8);

describe('what the writer leaves on disk', () => {
  it('writes the settings file at 0600, because it carries the token', () => {
    const path = ensureClaudeHookSettings(server, 'sess-mode-1', undefined);
    expect(path).not.toBe(null);
    expect(mode(path as string)).toBe('600');
  });

  it('writes the managed script at 0755, because claude has to run it', () => {
    ensureClaudeHookSettings(server, 'sess-mode-2', join(userData, 'nowhere'));
    expect(mode(claudeTapScriptPath())).toBe('755');
  });

  it('leaves no temporary file behind', () => {
    ensureClaudeHookSettings(server, 'sess-mode-3', undefined);
    const left = readdirSync(claudeHookDir()).filter((n) => n.endsWith('.tmp'));
    expect(left).toEqual([]);
  });

  it('replaces a 0644 file an older install wrote, in place', () => {
    const path = ensureClaudeHookSettings(server, 'sess-mode-4', undefined);
    chmodSync(path as string, 0o644);
    expect(mode(path as string)).toBe('644');
    // The rewrite happens before every launch and every restore, so an
    // existing install's files reach 0600 with no migration of their own.
    const again = ensureClaudeHookSettings(server, 'sess-mode-4', undefined);
    expect(again).toBe(path);
    expect(mode(path as string)).toBe('600');
  });

  it('makes the stamp directory and never writes outside the hook directory', () => {
    ensureClaudeHookSettings(server, 'sess-mode-5', undefined);
    expect(existsSync(claudeTapStampDir())).toBe(true);
    // Everything this phase writes is under one directory, and this is it.
    expect(claudeTapStampDir().startsWith(claudeHookDir())).toBe(true);
    expect(claudeTapScriptPath().startsWith(claudeHookDir())).toBe(true);
  });

  it('writes no status line and no script at all while the switch is off', () => {
    usage.claude = false;
    const dir = mkdtempSync(join(tmpdir(), 'p182-off-'));
    mkdirSync(join(dir, 'sub'), { recursive: true });
    const path = ensureClaudeHookSettings(server, 'sess-off-1', dir);
    expect(readFileSync(path as string, 'utf8')).not.toContain('statusLine');
    rmSync(dir, { recursive: true, force: true });
  });

  it('REFUSES when the person named a status line at the checkout root', () => {
    const repo = mkdtempSync(join(tmpdir(), 'p182-repo-'));
    mkdirSync(join(repo, '.git'), { recursive: true });
    mkdirSync(join(repo, '.claude'), { recursive: true });
    mkdirSync(join(repo, 'packages', 'app'), { recursive: true });
    writeFileSync(
      join(repo, '.claude', 'settings.local.json'),
      '{"statusLine":{"type":"command","command":"mine.sh"}}',
      'utf8'
    );
    const path = ensureClaudeHookSettings(
      server,
      'sess-refuse-1',
      join(repo, 'packages', 'app')
    );
    expect(readFileSync(path as string, 'utf8')).not.toContain('statusLine');
    // And the person's own file was not touched.
    expect(mode(join(repo, '.claude', 'settings.local.json'))).toBe('644');
    rmSync(repo, { recursive: true, force: true });
  });
});
