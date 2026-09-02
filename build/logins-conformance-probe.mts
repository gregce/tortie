/**
 * logins-conformance-probe.mts. The SHIPPING logins modules, run under node,
 * printed as JSON for build/conformance-logins.mjs to judge (Phase 202).
 *
 * It imports the shipping modules rather than a copy, so the gate is testing
 * what the app does. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request, and reads nothing under the
 * person's home: every path it touches is under the scratch root it is handed.
 *
 * `P202_LOGINS_DIR` points the two store modules somewhere else, which is how
 * the gate runs the same probe over an ABLATED copy and watches it go red. A
 * gate whose checks cannot fail proves nothing.
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EMPTY_EXECUTION_FIELDS, executionHash } from '../src/main/config/confirm';
import { loginPaneEnv, newSessionRecord, paneEnvFor } from '../src/main/sessions/launch-plan';
import type { AgentLaunchSpec } from '../src/main/manifest';

const MODULES = process.env['P202_LOGINS_DIR'] ?? 'src/main/logins';

const dirs = (await import(
  pathToFileURL(resolve(MODULES, 'dirs.ts')).href
)) as typeof import('../src/main/logins/dirs');
const store = (await import(
  pathToFileURL(resolve(MODULES, 'store.ts')).href
)) as typeof import('../src/main/logins/store');

/** A value only this probe ever writes. If it appears anywhere, say where. */
const TOKEN = 'P202-SENTINEL-TOKEN-8f3c1a';

const root = mkdtempSync(join(tmpdir(), 'p202-gate-'));
const out: Record<string, unknown> = {};

try {
  // -------------------------------------------------------------------------
  // 1. The ownership rule, over the shapes an escape would be spelled as.
  // -------------------------------------------------------------------------
  const owned: ['claude' | 'codex', string, boolean][] = [
    ['claude', dirs.loginDirIn(root, 'claude', 'a'.repeat(16)), true],
    ['codex', dirs.loginDirIn(root, 'codex', 'b'.repeat(16)), true],
    // THE OTHER PROVIDER'S TREE IS NOT THIS PROVIDER'S. A remove asked for a
    // claude login may never reach a codex one, however it is spelled.
    ['claude', dirs.loginDirIn(root, 'codex', 'b'.repeat(16)), false],
    ['claude', join(root, 'claude'), false],
    ['claude', join(root, 'claude', 'x', 'y'), false],
    ['claude', join(root, 'codex', 'x'), false],
    ['claude', join(root, '..', 'elsewhere'), false],
    ['claude', join(root, 'claude', '..', '..', 'elsewhere'), false],
    ['claude', '/Users/somebody/.claude', false],
    ['codex', '/Users/somebody/.codex', false],
    ['claude', `${root}/claude/../../etc`, false],
    ['claude', 'relative/path', false],
    ['claude', '', false]
  ];
  out['owned'] = owned.map(([provider, path, want]) => ({
    provider,
    path: path.startsWith(root) ? `<root>${path.slice(root.length)}` : path,
    want,
    got: dirs.isOwnedLoginDir(root, provider, path)
  }));

  // -------------------------------------------------------------------------
  // 2. A store file an agent could have written. Every bad row is dropped
  //    WHOLE and named; nothing outside the root is composed from one.
  // -------------------------------------------------------------------------
  const victim = join(root, 'victim');
  mkdirSync(victim, { recursive: true });
  writeFileSync(join(victim, 'keep.txt'), 'the person own files', 'utf8');
  mkdirSync(root, { recursive: true });
  writeFileSync(
    dirs.loginsFileIn(root),
    JSON.stringify({
      v: 1,
      chosen: { claude: 'Escape' },
      logins: [
        { provider: 'claude', id: '../victim', name: 'Escape', createdAt: 1 },
        { provider: 'claude', id: '/Users/gdc/.claude', name: 'Absolute', createdAt: 2 },
        { provider: 'claude', id: 'aaaaaaaa/bbbbbbbb', name: 'Separator', createdAt: 3 },
        { provider: 'claude', id: 'c'.repeat(16), name: '../etc', createdAt: 4 },
        { provider: 'nope', id: 'd'.repeat(16), name: 'Wrong', createdAt: 5 }
      ]
    }),
    'utf8'
  );
  const hostile = store.readLoginsFile(root);
  out['hostile'] = {
    kept: hostile.file.logins.length,
    problems: hostile.problems.length,
    // THE SENTENCES THEMSELVES, because "an invalid row is dropped whole and
    // surfaces as a visible error naming the field and the reason" is the
    // standing rule for every file an agent can write, and a count alone
    // cannot tell a right refusal from a lucky one.
    reasons: hostile.problems.map((text) => text.slice(0, 64)),
    chosen: hostile.file.chosen['claude'] ?? null,
    effectiveDir: store.effectiveLogin(root, 'claude').dir
  };
  // The remove aimed at the dropped row's name, and what happened to the
  // directory it named.
  const removeEscape = store.removeLogin(root, 'claude', 'Escape');
  const removeDefault = store.removeLogin(root, 'claude', 'Default');
  out['refusals'] = {
    escape: removeEscape.ok,
    escapeReason: removeEscape.ok ? '' : removeEscape.reason,
    default: removeDefault.ok,
    victimSurvives: existsSync(join(victim, 'keep.txt'))
  };

  // -------------------------------------------------------------------------
  // 3. A real login, and the fallback when its directory is gone.
  // -------------------------------------------------------------------------
  rmSync(dirs.loginsFileIn(root), { force: true });
  const added = store.addLogin(root, 'claude', 'Work');
  if (!added.ok) throw new Error(`add refused: ${added.reason}`);
  const dir = added.dir ?? '';
  store.chooseLogin(root, 'claude', 'Work');
  // THE FIXTURE CREDENTIAL. It is a synthetic shape holding a sentinel, in a
  // directory this probe made. Nothing reads the person's own anywhere.
  writeFileSync(
    join(dir, '.credentials.json'),
    JSON.stringify({ claudeAiOauth: { accessToken: TOKEN, subscriptionType: 'max' } }),
    'utf8'
  );
  const chosen = store.effectiveLogin(root, 'claude');
  out['chosen'] = {
    name: chosen.name,
    owned: dirs.isOwnedLoginDir(root, 'claude', chosen.dir ?? ''),
    fellBack: chosen.fellBack
  };
  const defaultLogin = store.effectiveLogin(root, 'codex');
  out['defaultLogin'] = {
    name: defaultLogin.name,
    dir: defaultLogin.dir,
    fellBack: defaultLogin.fellBack
  };

  // -------------------------------------------------------------------------
  // 4. NO TOKEN BYTE, and no directory either, in the row or in the argv.
  // -------------------------------------------------------------------------
  const spec = {
    agent: 'claude',
    argv: ['/opt/bin/claude', '--session-id', 'abc'],
    agentSessionId: 'abc',
    resumeArgv: ['/opt/bin/claude', '--resume', 'abc'],
    env: { FORCE_COLOR: '1' },
    idCapture: 'preassigned'
  } as unknown as AgentLaunchSpec;
  const facts = {
    id: 'p202',
    input: { name: 'n', projectPath: '/p', agent: 'claude' as const },
    cwd: '/p',
    spec,
    capture: undefined,
    agentVersion: null,
    binPath: '/opt/bin/claude',
    cwdReal: '/p',
    projectReal: '/p',
    now: 1
  };
  const record = newSessionRecord({ ...facts, login: chosen.name });
  const rowText = JSON.stringify(record);
  const paneEnv = paneEnvFor(
    spec.env,
    {},
    'p202',
    {},
    loginPaneEnv('claude', chosen.dir)
  );
  out['leak'] = {
    login: record.login ?? null,
    tokenInRow: rowText.includes(TOKEN),
    tokenInArgv: JSON.stringify(record.argv).includes(TOKEN),
    tokenInResumeArgv: JSON.stringify(record.resumeArgv ?? []).includes(TOKEN),
    tokenInPaneEnv: JSON.stringify(paneEnv).includes(TOKEN),
    dirInRow: rowText.includes(dir),
    dirInArgv: JSON.stringify(record.argv).includes(dir),
    dirInRowEnv: JSON.stringify(record.env ?? {}).includes(dir),
    paneEnvDir: paneEnv['CLAUDE_CONFIG_DIR'] === dir,
    paneStamp: paneEnv['GMUX_SESSION_ID'] === 'p202'
  };

  // -------------------------------------------------------------------------
  // 5. THE CONFIRM HASH DOES NOT MOVE FOR A LOGIN CHOICE.
  // -------------------------------------------------------------------------
  const fields = {
    ...EMPTY_EXECUTION_FIELDS,
    launchable: true,
    binaries: ['claude'],
    launchArgv: ['claude'],
    launchEnv: { FORCE_COLOR: '1' },
    idCaptureMode: 'pre-assign'
  };
  const before = executionHash('myagent', fields);
  // The login is chosen, a session is composed under it, and the SAME fields
  // are hashed again. Nothing an agent entry carries can see a login, which is
  // the structural half of the claim; this is the measured half.
  store.chooseLogin(root, 'claude', 'Work');
  newSessionRecord({ ...facts, login: 'Work' });
  const after = executionHash('myagent', fields);
  // And the one shape that WOULD move it, so the hash is seen to be able to
  // move at all: a variable added to `launch.env`, which is exactly where the
  // login deliberately never travels.
  const moved = executionHash('myagent', {
    ...fields,
    launchEnv: { ...fields.launchEnv, CLAUDE_CONFIG_DIR: dir }
  });
  out['hash'] = {
    before,
    after,
    equal: before === after,
    movedWhenEnvGrows: moved !== before,
    fieldKeys: Object.keys(EMPTY_EXECUTION_FIELDS).sort()
  };

  // -------------------------------------------------------------------------
  // 6. The folder is deleted underneath the chosen login.
  // -------------------------------------------------------------------------
  rmSync(dir, { recursive: true, force: true });
  const gone = store.effectiveLogin(root, 'claude');
  out['gone'] = { name: gone.name, dir: gone.dir, fellBack: gone.fellBack, asked: gone.asked };

  // -------------------------------------------------------------------------
  // 7. The store file itself holds no path and no token.
  // -------------------------------------------------------------------------
  const fileText = (await import('node:fs')).readFileSync(dirs.loginsFileIn(root), 'utf8');
  out['file'] = {
    hasToken: fileText.includes(TOKEN),
    hasSeparator: fileText.includes('/'),
    hasHome: fileText.includes('.claude') || fileText.includes('.codex')
  };
} finally {
  rmSync(root, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(out)}\n`);
