/**
 * logins-conformance-probe.mts. The SHIPPING logins modules, run under node,
 * printed as JSON for build/conformance-logins.mjs to judge (Phase 202).
 *
 * It imports the shipping modules rather than a copy, so the gate is testing
 * what the app does. It launches no Electron, opens no window, starts no tmux
 * server, spawns no agent, makes no request, and reads nothing under the
 * person's home: every path it touches is under the scratch root it is handed.
 *
 * `P202_LOGINS_DIR` points the two store modules somewhere else, and
 * `P203_ACCOUNTS_DIR` does the same for the account reader, which is how the
 * gate runs the same probe over an ABLATED copy and watches it go red. A gate
 * whose checks cannot fail proves nothing.
 *
 * PHASE 203 ADDED THE PRESENCE AND ACCOUNT READINGS. Everything below section
 * 8 runs the SHIPPING `src/main/usage/login-accounts.ts` with injected seams,
 * so it opens no keychain, spawns nothing and reads no vendor file: the
 * keychain is a set of names and the file system is a bag of strings.
 */

import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EMPTY_EXECUTION_FIELDS, executionHash } from '../src/main/config/confirm';
import { loginPaneEnv, newSessionRecord, paneEnvFor } from '../src/main/sessions/launch-plan';
import type { AgentLaunchSpec } from '../src/main/manifest';

const MODULES = process.env['P202_LOGINS_DIR'] ?? 'src/main/logins';
const ACCOUNTS = process.env['P203_ACCOUNTS_DIR'] ?? 'src/main/usage';

const dirs = (await import(
  pathToFileURL(resolve(MODULES, 'dirs.ts')).href
)) as typeof import('../src/main/logins/dirs');
const store = (await import(
  pathToFileURL(resolve(MODULES, 'store.ts')).href
)) as typeof import('../src/main/logins/store');
const accounts = (await import(
  pathToFileURL(resolve(ACCOUNTS, 'login-accounts.ts')).href
)) as typeof import('../src/main/usage/login-accounts');
const credentials = (await import(
  pathToFileURL(resolve(ACCOUNTS, 'credentials.ts')).href
)) as typeof import('../src/main/usage/credentials');

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
  // 2b. A LOGIN DIRECTORY THAT IS A LINK, planted before anything reads the
  //     store, which is the whole threat model. Every shape here is a real
  //     symlink on a real disk, because the thirteen shapes above are all
  //     SPELLED paths and a spelled path cannot express this attack at all.
  // -------------------------------------------------------------------------
  const linkRoot = join(root, 'linked');
  const outside = join(root, 'not-tortie-own');
  mkdirSync(outside, { recursive: true });
  // A synthetic credential in a directory Tortie does not own. If any reading
  // below says `present`, Tortie followed the link to find this file.
  writeFileSync(
    join(outside, '.credentials.json'),
    JSON.stringify({ claudeAiOauth: { accessToken: TOKEN, subscriptionType: 'team' } }),
    'utf8'
  );
  const linkedId = 'd'.repeat(16);
  mkdirSync(dirs.loginProviderRootIn(linkRoot, 'claude'), { recursive: true });
  symlinkSync(outside, dirs.loginDirIn(linkRoot, 'claude', linkedId));
  writeFileSync(
    dirs.loginsFileIn(linkRoot),
    JSON.stringify({
      v: 1,
      chosen: { claude: 'Planted' },
      logins: [{ provider: 'claude', id: linkedId, name: 'Planted', createdAt: 1 }]
    }),
    'utf8'
  );
  const linkedDir = dirs.loginDirIn(linkRoot, 'claude', linkedId);
  const linkedRead = store.readLoginsFile(linkRoot);
  const linkedList = store.listLogins(linkRoot);
  // The provider root as a link, and the logins root as a link, which are the
  // two components a check on the entry alone would walk straight past.
  const linkedBaseRoot = join(root, 'linked-base');
  const baseElsewhere = join(root, 'base-elsewhere');
  const baseId = 'e'.repeat(16);
  mkdirSync(join(baseElsewhere, baseId), { recursive: true });
  mkdirSync(linkedBaseRoot, { recursive: true });
  symlinkSync(baseElsewhere, dirs.loginProviderRootIn(linkedBaseRoot, 'claude'));
  const realRoot = join(root, 'real-root');
  const rootId = 'f'.repeat(16);
  mkdirSync(join(realRoot, 'claude', rootId), { recursive: true });
  const linkedRootLink = join(root, 'root-link');
  symlinkSync(realRoot, linkedRootLink);
  // A file where a folder should be, and a folder that is simply GONE, which
  // must NOT read as an escape or the fallback below stops being honest.
  const fileRoot = join(root, 'file-root');
  const fileId = 'a'.repeat(16);
  mkdirSync(dirs.loginProviderRootIn(fileRoot, 'claude'), { recursive: true });
  writeFileSync(dirs.loginDirIn(fileRoot, 'claude', fileId), 'not a folder', 'utf8');
  out['linked'] = {
    // The spelling rule says the link is inside the root, which is exactly
    // why the disk rule exists. If this ever reads false the attack changed.
    spelledInside: dirs.isOwnedLoginDir(linkRoot, 'claude', linkedDir),
    entry: dirs.loginDirOnDisk(linkRoot, 'claude', linkedDir),
    providerRoot: dirs.loginDirOnDisk(
      linkedBaseRoot,
      'claude',
      dirs.loginDirIn(linkedBaseRoot, 'claude', baseId)
    ),
    loginsRoot: dirs.loginDirOnDisk(
      linkedRootLink,
      'claude',
      dirs.loginDirIn(linkedRootLink, 'claude', rootId)
    ),
    notAFolder: dirs.loginDirOnDisk(fileRoot, 'claude', dirs.loginDirIn(fileRoot, 'claude', fileId)),
    absent: dirs.loginDirOnDisk(fileRoot, 'claude', dirs.loginDirIn(fileRoot, 'claude', 'b'.repeat(16))),
    kept: linkedRead.file.logins.length,
    problems: linkedRead.problems.map((text) => text.slice(0, 64)),
    listed: linkedList.logins.filter((l) => !l.isDefault).length,
    presentAnywhere: linkedList.logins.some((l) => l.present && !l.isDefault),
    chosen: linkedRead.file.chosen['claude'] ?? null,
    resolvedDir: store.resolveLoginDir(linkRoot, 'claude', 'Planted').dir,
    effectiveDir: store.effectiveLogin(linkRoot, 'claude').dir,
    chooseOk: store.chooseLogin(linkRoot, 'claude', 'Planted').ok,
    // AND THE DIRECTORY IT POINTED AT IS UNTOUCHED by every refusal above.
    victimSurvives: existsSync(join(outside, '.credentials.json'))
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
  // 8. PRESENCE IS THE WHOLE QUESTION (Phase 203), which is the first defect
  //    the operator reported. Every seam is injected: the keychain is a set of
  //    service names and the file system is a bag of strings, so nothing here
  //    opens a keychain, spawns a process or reads a vendor file.
  // -------------------------------------------------------------------------
  const seams = (
    items: string[],
    files: Record<string, string>,
    env: Record<string, string | undefined> = {},
    home = '/nowhere'
  ): Parameters<typeof accounts.readLoginPresence>[0] => {
    const set = new Set(items);
    return {
      keychainHas: async (service: string) => set.has(service),
      exists: async (path: string) => Object.hasOwn(files, path),
      readText: async (path: string) => files[path] ?? null,
      env,
      home,
      now: () => 0
    };
  };

  // A REAL added login, made here, because section 6 above deleted the
  // folder of the one it was testing the fallback with.
  const listAdd = store.addLogin(root, 'claude', 'Keychain');
  if (!listAdd.ok) throw new Error(`add refused: ${listAdd.reason}`);
  const liveDir = listAdd.dir ?? '';
  const scoped = credentials.claudeScopedService(liveDir);
  const askedForLogin: string[] = [];
  const scopedProbe = {
    ...seams([], {}),
    keychainHas: async (service: string) => {
      askedForLogin.push(service);
      return false;
    }
  };
  await accounts.readLoginPresence(scopedProbe, 'claude', liveDir);
  const askedForDefault: string[] = [];
  await accounts.readLoginPresence(
    {
      ...seams([], {}),
      keychainHas: async (service: string) => {
        askedForDefault.push(service);
        return false;
      }
    },
    'claude',
    null
  );
  out['presence'] = {
    // THE DEFECT AND THE FIX SIDE BY SIDE. macOS writes no credentials file
    // for a claude login, so the keychain half is the only half there is.
    keychainOnly: await accounts.readLoginPresence(seams([scoped], {}), 'claude', liveDir),
    fileOnly: await accounts.readLoginPresence(
      seams([], { [`${liveDir}/.credentials.json`]: '{}' }),
      'claude',
      liveDir
    ),
    neither: await accounts.readLoginPresence(seams([], {}), 'claude', liveDir),
    codexFile: await accounts.readLoginPresence(
      seams([], { [`${liveDir}/auth.json`]: '{}' }),
      'codex',
      liveDir
    ),
    codexNone: await accounts.readLoginPresence(seams([], {}), 'codex', liveDir),
    // THE SCOPED NAME IS DERIVED FROM THE DIRECTORY, and this is the name the
    // operator's own keychain really holds for his added login.
    scoped,
    // A LOGIN GETS THE SCOPED NAME AND NOTHING ELSE. Falling through to the
    // plain item would read the PERSON'S OWN default credential and call it
    // the second login's, which is the lie research 72 forbids.
    askedForLogin: [...askedForLogin],
    askedForDefault: [...askedForDefault],
    // The whole list, over a REAL added login whose only credential is the
    // keychain item, against the cheap list that says the opposite. That
    // opposite IS the defect: `Not signed in yet`, for ever, about a login the
    // person really signed into.
    wholeListPresent: (
      await store.listLoginsAsking(root, async (provider, dir) =>
        dir === null
          ? { present: false, email: null }
          : {
              present: await accounts.readLoginPresence(
                seams([credentials.claudeScopedService(dir)], {}),
                provider,
                dir
              ),
              email: null
            }
      )
    ).logins.some((l) => l.name === 'Keychain' && l.present),
    cheapListPresent: store
      .listLogins(root)
      .logins.some((l) => l.name === 'Keychain' && l.present),
    // A FOLDER THAT IS GONE IS NEVER ASKED ABOUT. `Work` above had its folder
    // deleted in section 6 and its row is still in the file. Removing a login
    // leaves the scoped keychain item behind for ever, so an ask here would
    // answer present for a directory that is not there.
    goneListPresent: (
      await store.listLoginsAsking(root, async () => ({ present: true, email: null }))
    ).logins.some((l) => l.name === 'Work' && l.present),
    // The directory the scoped name above was derived from, so the gate can
    // re-derive that name by its own method rather than trusting this one.
    dir: liveDir
  };

  // -------------------------------------------------------------------------
  // 8b. THE ACCOUNT, and the decoy the default path must not fall into.
  // -------------------------------------------------------------------------
  const claimText = (claims: unknown): string =>
    Buffer.from(JSON.stringify(claims), 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  const idToken = `header.${claimText({ email: 'somebody@example.com', secret: TOKEN })}.sig`;
  const claudeJson = JSON.stringify({
    oauthAccount: { emailAddress: 'somebody@example.com' }
  });
  const markupJson = JSON.stringify({
    oauthAccount: { emailAddress: '<img src=x onerror=alert(1)>@example.com' }
  });
  const codexJson = JSON.stringify({ tokens: { id_token: idToken, access_token: TOKEN } });
  const known = await accounts.readLoginAccount(
    seams([], { [`${liveDir}/.claude.json`]: claudeJson }),
    'claude',
    liveDir
  );
  const codexKnown = await accounts.readLoginAccount(
    seams([], { [`${liveDir}/auth.json`]: codexJson }),
    'codex',
    liveDir
  );
  out['account'] = {
    claude: known,
    // CODEX HAS FULL PARITY, read from the id token's own email claim.
    codex: codexKnown,
    // A LOGIN THAT HAS NOT TAKEN A TURN NAMES NO ADDRESS, which is honest
    // rather than broken.
    fresh: await accounts.readLoginAccount(
      seams([], { [`${liveDir}/.claude.json`]: JSON.stringify({ numStartups: 1 }) }),
      'claude',
      liveDir
    ),
    missing: await accounts.readLoginAccount(seams([], {}), 'claude', liveDir),
    // MARKUP IN THE FIELD IS NOT AN ADDRESS.
    markup: await accounts.readLoginAccount(
      seams([], { [`${liveDir}/.claude.json`]: markupJson }),
      'claude',
      liveDir
    ),
    notJson: await accounts.readLoginAccount(
      seams([], { [`${liveDir}/auth.json`]: 'not json' }),
      'codex',
      liveDir
    ),
    // NO TOKEN BYTE. The codex token carried a sentinel and the answer holds
    // an address and nothing else.
    tokenInAnswer: JSON.stringify(codexKnown).includes(TOKEN),
    // THE DECOY. `~/.claude/.claude.json` exists on the operator's machine and
    // holds no oauthAccount, so the default account file must be spelled apart
    // from the default credential file or defect two comes back inside its own
    // fix.
    decoyAccountFile: accounts.claudeAccountFileFor({ env: {}, home: '/h' }, null),
    decoyCredentialFile: accounts.claudeCredentialFileFor({ env: {}, home: '/h' }, null),
    scopedAccountFile: accounts.claudeAccountFileFor({ env: {}, home: '/h' }, '/d/x')
  };

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
