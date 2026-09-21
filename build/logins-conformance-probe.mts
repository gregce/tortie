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
 * whose checks cannot fail proves nothing. Both copies must be SIBLINGS of
 * `logins/` and `usage/` under `src/main/`, because the usage copy imports
 * `../proc/guarded` and `../credentials/security-print`; the gate places them
 * there (Phase 281, and why is in its own header).
 *
 * PHASE 203 ADDED THE PRESENCE AND ACCOUNT READINGS. Everything below section
 * 8 runs the SHIPPING `src/main/usage/login-accounts.ts` with injected seams,
 * so it opens no keychain, spawns nothing and reads no vendor file: the
 * keychain is a list of (service, account) items and the file system is a bag
 * of strings.
 *
 * PHASE 281 ADDED SECTION 9, and it is the one place this probe starts a
 * process. `keychainReader` has exactly one seam below its argv, being the
 * program it runs, so the argv it sends and what it makes of each exit can
 * only be read by handing it a program. The probe WRITES those programs
 * itself, as `/bin/sh` scripts in its own scratch root standing in for
 * `security`: one records its argv and answers from two synthetic items the
 * way `security` matches (first match, `-a` narrowing it), and three do
 * nothing but exit 44, 36 and 1. The shipping reader starts each one and
 * WAITS for it; every one exits at once, holds no loop and no sleeper, so
 * nothing is left running when the reader returns, and the scripts go with
 * the scratch root in the `finally`. `/usr/bin/security` is never run, no
 * keychain is opened, and every account name is a synthetic `p281-` one.
 */

import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EMPTY_EXECUTION_FIELDS, executionHash } from '../src/main/config/confirm';
import { loginPaneEnv, newSessionRecord, paneEnvFor } from '../src/main/sessions/launch-plan';
import type { AgentLaunchSpec } from '../src/main/manifest';

const MODULES = process.env['P202_LOGINS_DIR'] ?? 'src/main/logins';
const ACCOUNTS = process.env['P203_ACCOUNTS_DIR'] ?? 'src/main/usage';
/**
 * PHASE 287. Where `login-copy.ts` is read from, so rule 19's words can be
 * ablated over a sibling copy the way the two domains above already are. It
 * imports nothing at runtime (its one import is a type), so a copy of it
 * resolves wherever the gate stages it.
 */
const COPY = process.env['P287_COPY_DIR'] ?? 'src/shared';

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
const copy = (await import(
  pathToFileURL(resolve(COPY, 'login-copy.ts')).href
)) as typeof import('../src/shared/login-copy');

/** A value only this probe ever writes. If it appears anywhere, say where. */
const TOKEN = 'P202-SENTINEL-TOKEN-8f3c1a';

/**
 * PHASE 281. The two keychain accounts every reading below is keyed by. Both
 * are synthetic, and `USER` is set to the first in every environment handed to
 * the shipping code, so the vendor account rule answers it and never the name
 * of whoever runs the gate. The second stands for the stray item research 126
 * §2.4 found under the same service name on the operator's machine.
 */
const VENDOR_ACCOUNT = 'p281-vendor';
const STRAY_ACCOUNT = 'p281-stray';

const root = mkdtempSync(join(tmpdir(), 'p202-gate-'));
/** PHASE 287's own scratch roots, removed in the same `finally` as `root`. */
const capRoots: string[] = [];
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
  // 2c. THE CREATE PATH UNDER A LINKED PROVIDER ROOT (Phase 219, item 1).
  //     Section 2b proves every READ refuses this shape. Nothing proved the
  //     WRITE, and it did not refuse: `addLogin` answered ok and made its
  //     folder in a directory Tortie does not own, which the next `listLogins`
  //     then dropped, so the only trace was an empty folder somewhere else.
  //     The victim directory is counted before and after, which is the whole
  //     reading: a refusal that leaves a folder behind is not a refusal.
  // -------------------------------------------------------------------------
  const createRoot = join(root, 'create-linked');
  const createVictim = join(root, 'create-victim');
  mkdirSync(createVictim, { recursive: true });
  mkdirSync(createRoot, { recursive: true });
  symlinkSync(createVictim, dirs.loginProviderRootIn(createRoot, 'claude'));
  const linkedAdd = store.addLogin(createRoot, 'claude', 'Planted');
  // AND THE HONEST HALF. A root with no link in it must still create, or the
  // guard above is refusing everything and this reading proves nothing.
  const plainRoot = join(root, 'create-plain');
  mkdirSync(plainRoot, { recursive: true });
  const plainAdd = store.addLogin(plainRoot, 'claude', 'Ordinary');
  out['create'] = {
    linkedOk: linkedAdd.ok,
    linkedReason: linkedAdd.ok ? null : (linkedAdd.reason ?? '').slice(0, 64),
    victimEntries: readdirSync(createVictim).length,
    ancestorLink: dirs.loginAncestorIsLink(createRoot, 'claude'),
    // The logins ROOT as a link is the same attack one level up.
    rootLinkAncestor: dirs.loginAncestorIsLink(linkedRootLink, 'claude'),
    plainOk: plainAdd.ok,
    plainAncestor: dirs.loginAncestorIsLink(plainRoot, 'claude'),
    plainDirOwned: dirs.isOwnedLoginDir(plainRoot, 'claude', plainAdd.dir ?? ''),
    // A provider root that is simply NOT THERE YET is not a link, which is
    // what makes the predicate usable in front of a mkdir at all.
    absentAncestor: dirs.loginAncestorIsLink(join(root, 'create-absent'), 'claude')
  };

  // -------------------------------------------------------------------------
  // 2e. THE SWEEP ITSELF UNDER A LINKED PROVIDER ROOT (Phase 219's fix round).
  //     Section 2c asks the PREDICATE and section 2d drives the sweep over
  //     PLAIN roots, so nothing drove the sweep under a link: the verifier
  //     took the guard out of `strayLoginIds` by hand and every live rule
  //     here stayed green, the only failure being this gate's own "found
  //     nothing to edit". A guard pinned by its own text is not pinned.
  //
  //     BOTH DOORS ARE DRIVEN, and the second is why this arm is not one
  //     line. `strayLoginIds` carries the guard. `removeStrayLoginDir` does
  //     not, and `finishStraysOnce` in ../src/main/credentials/keep.ts reaches
  //     it with ids from a SECOND source, being the record's own vault slots
  //     that no row names, which never pass through `strayLoginIds` at all.
  //     So an id aimed straight at the remove is the shape that actually
  //     escapes, and the victim's own contents are counted on both sides.
  // -------------------------------------------------------------------------
  const sweepLinkRoot = join(root, 'sweep-linked');
  const sweepVictim = join(root, 'sweep-victim');
  const plantedStrayId = 'd'.repeat(16);
  mkdirSync(join(sweepVictim, plantedStrayId), { recursive: true });
  writeFileSync(
    join(sweepVictim, plantedStrayId, '.credentials.json'),
    JSON.stringify({ claudeAiOauth: { accessToken: TOKEN } }),
    'utf8'
  );
  mkdirSync(sweepLinkRoot, { recursive: true });
  symlinkSync(sweepVictim, dirs.loginProviderRootIn(sweepLinkRoot, 'claude'));
  // A file Tortie CAN read, naming no login at all, so every hex directory
  // under that root is a stray by the plain rule and only the link stops it.
  writeFileSync(dirs.loginsFileIn(sweepLinkRoot), '{"v":1,"chosen":{},"logins":[]}', 'utf8');
  const linkedStrays = store.strayLoginIds(sweepLinkRoot, 'claude');
  for (const id of linkedStrays) store.removeStrayLoginDir(sweepLinkRoot, 'claude', id);
  const aimedAtLinked = store.removeStrayLoginDir(sweepLinkRoot, 'claude', plantedStrayId);
  out['sweepLinked'] = {
    strays: linkedStrays,
    aimed: aimedAtLinked,
    victimEntries: existsSync(sweepVictim) ? readdirSync(sweepVictim).length : -1,
    credentialSurvives: existsSync(join(sweepVictim, plantedStrayId, '.credentials.json')),
    // AND THE HONEST HALF, on a root with no link in it: the same planted
    // directory must still be named a stray and must still be removed, or the
    // guard has turned the sweep off rather than made it careful.
    plain: (() => {
      const plainSweepRoot = join(root, 'sweep-plain');
      mkdirSync(join(plainSweepRoot, 'claude', plantedStrayId), { recursive: true });
      writeFileSync(dirs.loginsFileIn(plainSweepRoot), '{"v":1,"chosen":{},"logins":[]}', 'utf8');
      const found = store.strayLoginIds(plainSweepRoot, 'claude');
      const removed = store.removeStrayLoginDir(plainSweepRoot, 'claude', plantedStrayId);
      return {
        strays: found,
        removed,
        gone: !existsSync(join(plainSweepRoot, 'claude', plantedStrayId))
      };
    })()
  };

  // -------------------------------------------------------------------------
  // 2d. A NUMERIC ID IN THE RECORD (Phase 219, item 3). Tortie never writes
  //     that shape, so a file holding one was hand edited and cannot be read.
  //     The old `namedLoginIds` skipped the row and answered a set the rest of
  //     the file justified, which made the login that row named a STRAY, and
  //     the sweep deleted its folder and its credential. The module's own
  //     stated rule is that a file it cannot read authorises nothing.
  // -------------------------------------------------------------------------
  const numericRoot = join(root, 'numeric');
  const realId = '6939060162ec7922';
  const numericId = '1234567890123456';
  mkdirSync(join(numericRoot, 'claude', realId), { recursive: true });
  mkdirSync(join(numericRoot, 'claude', numericId), { recursive: true });
  writeFileSync(
    join(numericRoot, 'claude', numericId, '.credentials.json'),
    JSON.stringify({ claudeAiOauth: { accessToken: TOKEN } }),
    'utf8'
  );
  writeFileSync(
    dirs.loginsFileIn(numericRoot),
    `{"v":1,"chosen":{},"logins":[` +
      `{"provider":"claude","id":"${realId}","name":"Real","createdAt":1},` +
      `{"provider":"claude","id":${numericId},"name":"Numeric","createdAt":2}]}`,
    'utf8'
  );
  const numericKnown = store.namedLoginIds(numericRoot);
  const numericStrays = store.strayLoginIds(numericRoot, 'claude');
  for (const id of numericStrays) store.removeStrayLoginDir(numericRoot, 'claude', id);
  // AND THE HONEST HALF AGAIN. A well formed file must still name a stray, or
  // the sweep has been turned off rather than made careful.
  const sweepRoot = join(root, 'sweep');
  const strayId = 'c'.repeat(16);
  mkdirSync(join(sweepRoot, 'claude', realId), { recursive: true });
  mkdirSync(join(sweepRoot, 'claude', strayId), { recursive: true });
  writeFileSync(
    dirs.loginsFileIn(sweepRoot),
    `{"v":1,"chosen":{},"logins":[` +
      `{"provider":"claude","id":"${realId}","name":"Real","createdAt":1}]}`,
    'utf8'
  );
  out['numeric'] = {
    known: numericKnown === null ? null : [...numericKnown].length,
    strays: numericStrays,
    credentialSurvives: existsSync(join(numericRoot, 'claude', numericId, '.credentials.json')),
    namedFolderSurvives: existsSync(join(numericRoot, 'claude', realId)),
    // A row that is not an object at all, and a row with no id, are the same
    // hand edit wearing a different hat.
    sweepStrays: store.strayLoginIds(sweepRoot, 'claude'),
    sweepKnown: [...(store.namedLoginIds(sweepRoot) ?? [])].length,
    otherShapes: (['"not a row"', '{"provider":"claude","name":"NoId"}', 'null', '[]'] as const).map(
      (row) => {
        const shapeRoot = join(root, `shape-${Buffer.from(row).toString('hex').slice(0, 8)}`);
        mkdirSync(join(shapeRoot, 'claude', strayId), { recursive: true });
        writeFileSync(
          dirs.loginsFileIn(shapeRoot),
          `{"v":1,"chosen":{},"logins":[{"provider":"claude","id":"${realId}","name":"Real","createdAt":1},${row}]}`,
          'utf8'
        );
        return {
          row,
          known: store.namedLoginIds(shapeRoot) === null ? null : 'a set',
          strays: store.strayLoginIds(shapeRoot, 'claude').length
        };
      }
    )
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
  //    the operator reported. Every seam is injected: the keychain is a list
  //    of (service, account) items and the file system is a bag of strings, so
  //    nothing here opens a keychain, spawns a process or reads a vendor file.
  //
  //    PHASE 281 KEYED THE KEYCHAIN BY ACCOUNT TOO, and matches the way
  //    `security` does: the FIRST item whose service matches and, when an
  //    account was asked, whose account matches as well. A call that leaves
  //    the account out is therefore the service-only lookup that landed on the
  //    stray, and it is visible here as an answer rather than hidden by a
  //    model that ignored the second argument.
  // -------------------------------------------------------------------------
  const seams = (
    items: ReadonlyArray<readonly [string, string]>,
    files: Record<string, string>,
    env: Record<string, string | undefined> = { USER: VENDOR_ACCOUNT },
    home = '/nowhere',
    asked: unknown[][] = []
  ): Parameters<typeof accounts.readLoginPresence>[0] => {
    return {
      keychainHas: async (service: string, account: string) => {
        asked.push([service, account ?? null]);
        const narrowed = typeof account === 'string' && account !== '';
        return items.some(([s, a]) => s === service && (!narrowed || a === account));
      },
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
  const askedForLogin: unknown[][] = [];
  await accounts.readLoginPresence(
    seams([], {}, undefined, undefined, askedForLogin),
    'claude',
    liveDir
  );
  const askedForDefault: unknown[][] = [];
  await accounts.readLoginPresence(
    seams([], {}, undefined, undefined, askedForDefault),
    'claude',
    null
  );
  out['presence'] = {
    // THE DEFECT AND THE FIX SIDE BY SIDE. macOS writes no credentials file
    // for a claude login, so the keychain half is the only half there is.
    keychainOnly: await accounts.readLoginPresence(
      seams([[scoped, VENDOR_ACCOUNT]], {}),
      'claude',
      liveDir
    ),
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
                seams([[credentials.claudeScopedService(dir), VENDOR_ACCOUNT]], {}),
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
  // 9. THE ITEM CLAUDE CODE READS (Phase 281). Research 126 §5, §7 and §8.
  //
  //    Every directory here is a FIXED synthetic string that is never on disk,
  //    because nothing below reads a directory: the presence and credential
  //    seams are injected, and the scoped name is a hash of the string. So
  //    every reading is the same on every run and the gate compares them
  //    whole, re-deriving each service name by its own hash.
  //
  //    Nothing below prints a payload. A credential answer is reduced to WHOSE
  //    it is, `vendor` or `stray`, by comparing the token with the two
  //    synthetic ones this section wrote.
  // -------------------------------------------------------------------------
  const PLAIN = credentials.CLAUDE_KEYCHAIN_SERVICE;
  const LOGIN_DIR = '/p281/logins/claude/0123456789abcdef';
  const CONFIG_DIR = '/p281/config';
  // "cafe" and a COMBINING ACUTE ACCENT, which is the decomposed spelling of
  // the composed "café". Claude Code hashes the NFC form (research 126 §5,
  // `mI` and `we` in bundle 2.1.274), so both spellings name one item.
  const NFD_DIR = '/p281/café';
  const VENDOR_TOKEN = 'P281-VENDOR-SENTINEL-4d1e';
  const STRAY_TOKEN = 'P281-STRAY-SENTINEL-9b7a';
  const credentialText = (token: string, plan: string): string =>
    JSON.stringify({ claudeAiOauth: { accessToken: token, subscriptionType: plan } });
  const VENDOR_PAYLOAD = credentialText(VENDOR_TOKEN, 'max');
  const STRAY_PAYLOAD = credentialText(STRAY_TOKEN, 'pro');

  type CredentialDeps = Parameters<typeof credentials.readClaudeCredential>[0];
  /** Whose credential an answer is, or how it failed. Never the token. */
  const whose = async (read: () => Promise<unknown>): Promise<string> => {
    try {
      const got = await read();
      if (got === null) return 'null';
      if (typeof got === 'string') {
        return got === VENDOR_PAYLOAD ? 'vendor' : got === STRAY_PAYLOAD ? 'stray' : 'other';
      }
      const result = got as { kind: string; token?: string };
      if (result.kind !== 'ok') return result.kind;
      return result.token === VENDOR_TOKEN
        ? 'vendor'
        : result.token === STRAY_TOKEN
          ? 'stray'
          : 'other';
    } catch {
      return 'throw';
    }
  };
  /**
   * The credential reader's keychain seam over items kept in order, matched
   * the way `security` matches: the first item with the service and, when an
   * account was asked, that account. A call with no account is the
   * service-only lookup, and it meets whichever item is first.
   */
  const credentialSeams = (
    items: ReadonlyArray<readonly [string, string, string]>,
    env: Record<string, string | undefined>,
    asked: unknown[][],
    files: Record<string, string> = {}
  ): CredentialDeps => ({
    keychain: async (service: string, account: string) => {
      asked.push([service, account ?? null]);
      const narrowed = typeof account === 'string' && account !== '';
      const hit = items.find(([s, a]) => s === service && (!narrowed || a === account));
      return hit === undefined ? null : hit[2];
    },
    readText: async (path: string) => files[path] ?? null,
    env,
    home: '/p281/home'
  });

  // 9a. PRESENCE ASKS THE ONE ITEM, WITH THE ACCOUNT.
  const presenceLoginAsked: unknown[][] = [];
  await accounts.readLoginPresence(
    seams([], {}, undefined, undefined, presenceLoginAsked),
    'claude',
    LOGIN_DIR
  );
  const presenceDefaultAsked: unknown[][] = [];
  await accounts.readLoginPresence(
    seams([], {}, undefined, undefined, presenceDefaultAsked),
    'claude',
    null
  );
  const loginScoped = credentials.claudeScopedService(LOGIN_DIR);

  // 9b. THE PROGRAMS the shipping `keychainReader` runs instead of `security`.
  //     Each is started and waited for by the reader, exits at once, and is
  //     removed with `root` in the `finally` below.
  const binRoot = join(root, 'p281-security');
  const program = (name: string, body: string[]): { bin: string; argv(): string[][] } => {
    const dir = join(binRoot, name);
    mkdirSync(dir, { recursive: true });
    const bin = join(dir, 'security');
    writeFileSync(
      bin,
      [
        '#!/bin/sh',
        'here=$(dirname "$0")',
        // Every argument, separated by the unit separator so one holding a
        // space survives, one run per line.
        `printf '%s\\037' "$@" >> "$here/argv"`,
        `printf '\\n' >> "$here/argv"`,
        ...body,
        ''
      ].join('\n'),
      'utf8'
    );
    chmodSync(bin, 0o755);
    return {
      bin,
      argv: () => {
        const file = join(dir, 'argv');
        if (!existsSync(file)) return [];
        return readFileSync(file, 'utf8')
          .split('\n')
          .filter((line) => line !== '')
          .map((line) => line.split('').slice(0, -1));
      }
    };
  };
  /**
   * Two items under the plain name, the STRAY FIRST, which is the order that
   * made a service-only lookup wrong on the operator's machine. `-a` picks the
   * item by account; no `-a` meets the first; `-w` prints the payload and one
   * newline, as `security` does. Anything else is exit 44.
   */
  const firstMatch = (name: string): { bin: string; argv(): string[][] } => {
    const made = program(name, [
      "service=''",
      "account=''",
      'payload=0',
      "next=''",
      'for arg in "$@"; do',
      '  case "$next" in',
      '    a) account=$arg ;;',
      '    s) service=$arg ;;',
      '  esac',
      "  next=''",
      '  case "$arg" in',
      '    -a) next=a ;;',
      '    -s) next=s ;;',
      '    -w) payload=1 ;;',
      '  esac',
      'done',
      '[ "$service" = "$(cat "$here/service")" ] || exit 44',
      'if [ -z "$account" ]; then held=stray',
      'elif [ "$account" = "$(cat "$here/vendor-account")" ]; then held=vendor',
      'elif [ "$account" = "$(cat "$here/stray-account")" ]; then held=stray',
      'else exit 44',
      'fi',
      `if [ "$payload" = 1 ]; then cat "$here/$held"; printf '\\n'; fi`,
      'exit 0'
    ]);
    const dir = join(binRoot, name);
    writeFileSync(join(dir, 'service'), PLAIN, 'utf8');
    writeFileSync(join(dir, 'vendor-account'), VENDOR_ACCOUNT, 'utf8');
    writeFileSync(join(dir, 'stray-account'), STRAY_ACCOUNT, 'utf8');
    writeFileSync(join(dir, 'vendor'), VENDOR_PAYLOAD, 'utf8');
    writeFileSync(join(dir, 'stray'), STRAY_PAYLOAD, 'utf8');
    return made;
  };
  const exits = (code: number): { bin: string; argv(): string[][] } =>
    program(`exit-${String(code)}`, [`exit ${String(code)}`]);

  const direct = firstMatch('direct');
  const directAnswer = await whose(() =>
    credentials.keychainReader(direct.bin).keychain(PLAIN, VENDOR_ACCOUNT)
  );
  const throughCredential = firstMatch('credential');
  const throughCredentialAnswer = await whose(() =>
    credentials.readClaudeCredential(
      {
        keychain: credentials.keychainReader(throughCredential.bin).keychain,
        readText: async () => null,
        env: { USER: VENDOR_ACCOUNT },
        home: '/p281/home'
      },
      null
    )
  );
  const refused = firstMatch('refused');
  const refusedAnswer = await whose(() =>
    credentials.keychainReader(refused.bin).keychain(PLAIN, '')
  );

  // 9c. A MISS IS NOT A FAILURE: exit 44 alone is absent.
  const reader = (code: number): Promise<string> =>
    whose(() => credentials.keychainReader(exits(code).bin).keychain(PLAIN, VENDOR_ACCOUNT));
  const credentialOver = (bin: string, files: Record<string, string> = {}): Promise<string> =>
    whose(() =>
      credentials.readClaudeCredential(
        {
          keychain: credentials.keychainReader(bin).keychain,
          readText: async (path: string) => files[path] ?? null,
          env: { USER: VENDOR_ACCOUNT },
          home: '/p281/home'
        },
        null
      )
    );
  const exitAnswers = {
    '44': await reader(44),
    '36': await reader(36),
    '1': await reader(1),
    // A program that is not there: a spawn error, which is not a miss either.
    spawn: await whose(() =>
      credentials
        .keychainReader(join(binRoot, 'not-a-program', 'security'))
        .keychain(PLAIN, VENDOR_ACCOUNT)
    )
  };
  const credentialExits = {
    '44': await credentialOver(exits(44).bin),
    '36': await credentialOver(exits(36).bin),
    '1': await credentialOver(exits(1).bin),
    // AND THE FILE STILL STANDS IN when the keychain could not answer, so
    // the throw above is "nothing could be read", never "the keychain failed".
    fileStandsIn: await credentialOver(exits(36).bin, {
      '/p281/home/.claude/.credentials.json': VENDOR_PAYLOAD
    })
  };

  // 9d. BRANCH B. `CLAUDE_CONFIG_DIR` is set, there is no scoped item for it,
  //     and a usable item sits under the PLAIN name. Claude Code under that
  //     directory asks the scoped name and nothing else (research 126 §5), so
  //     the honest answer is `missing` whichever account the plain item has.
  const branchEnv = { CLAUDE_CONFIG_DIR: CONFIG_DIR, USER: VENDOR_ACCOUNT };
  const branchRow = async (
    items: ReadonlyArray<readonly [string, string, string]>
  ): Promise<{ answer: string; asked: unknown[][] }> => {
    const asked: unknown[][] = [];
    const answer = await whose(() =>
      credentials.readClaudeCredential(credentialSeams(items, branchEnv, asked), null)
    );
    return { answer, asked };
  };
  const configScoped = credentials.claudeScopedService(CONFIG_DIR);
  const branchB = {
    // The plain item belongs to another synthetic account.
    stray: await branchRow([[PLAIN, STRAY_ACCOUNT, STRAY_PAYLOAD]]),
    // The plain item belongs to the vendor account itself, which is the shape
    // a plain-name fallback that kept `-a` would still read.
    vendor: await branchRow([[PLAIN, VENDOR_ACCOUNT, VENDOR_PAYLOAD]]),
    // THE CONTROL. The scoped item exists under both accounts, the stray
    // first, so a reader that answers `missing` for everything, or asks
    // without the account, cannot pass.
    control: await branchRow([
      [configScoped, STRAY_ACCOUNT, STRAY_PAYLOAD],
      [configScoped, VENDOR_ACCOUNT, VENDOR_PAYLOAD]
    ])
  };

  // 9e. A DECOMPOSED DIRECTORY NAMES THE SAME ITEM AS ITS COMPOSED SPELLING.
  const nfdPresenceAsked: unknown[][] = [];
  await accounts.readLoginPresence(
    seams([], {}, undefined, undefined, nfdPresenceAsked),
    'claude',
    NFD_DIR
  );
  const nfdCredentialAsked: unknown[][] = [];
  await whose(() =>
    credentials.readClaudeCredential(
      credentialSeams([], { CLAUDE_CONFIG_DIR: NFD_DIR, USER: VENDOR_ACCOUNT }, nfdCredentialAsked),
      null
    )
  );

  out['vendor'] = {
    accounts: { vendor: VENDOR_ACCOUNT, stray: STRAY_ACCOUNT },
    plain: PLAIN,
    presence: {
      loginDir: LOGIN_DIR,
      loginAsked: presenceLoginAsked,
      defaultAsked: presenceDefaultAsked,
      // THE STRAY ALONE, under the login's own scoped name: present only to a
      // check that asked without the account.
      strayOnly: await accounts.readLoginPresence(
        seams([[loginScoped, STRAY_ACCOUNT]], {}),
        'claude',
        LOGIN_DIR
      ),
      // And the vendor item behind it, which must still read present.
      vendorBehindStray: await accounts.readLoginPresence(
        seams(
          [
            [loginScoped, STRAY_ACCOUNT],
            [loginScoped, VENDOR_ACCOUNT]
          ],
          {}
        ),
        'claude',
        LOGIN_DIR
      )
    },
    reader: {
      argv: direct.argv(),
      answer: directAnswer,
      credential: throughCredentialAnswer,
      credentialArgv: throughCredential.argv(),
      emptyAccount: refusedAnswer,
      emptyAccountSpawned: refused.argv().length
    },
    exits: exitAnswers,
    credentialExits,
    branchB: { configDir: CONFIG_DIR, ...branchB },
    nfc: {
      dir: NFD_DIR,
      scoped: credentials.claudeScopedService(NFD_DIR),
      composed: credentials.claudeScopedService(NFD_DIR.normalize('NFC')),
      viaConfig: credentials.claudeKeychainService({ CLAUDE_CONFIG_DIR: NFD_DIR }, null),
      viaSecure: credentials.claudeKeychainService(
        { CLAUDE_SECURESTORAGE_CONFIG_DIR: NFD_DIR },
        null
      ),
      viaLogin: credentials.claudeKeychainService({}, NFD_DIR),
      presenceAsked: nfdPresenceAsked,
      credentialAsked: nfdCredentialAsked
    },
    // THE NAMED EXCEPTION (Phase 281.1, rule 18): what Tortie names for a
    // chosen login when CLAUDE_SECURESTORAGE_CONFIG_DIR is defined. The gate
    // derives the vendor's answers itself and pins the disagreement to exactly
    // the empty and the set rows.
    secureLogin: {
      dir: LOGIN_DIR,
      secure: '/p281/secure',
      empty: credentials.claudeKeychainService({ CLAUDE_SECURESTORAGE_CONFIG_DIR: '' }, LOGIN_DIR),
      set: credentials.claudeKeychainService(
        { CLAUDE_SECURESTORAGE_CONFIG_DIR: '/p281/secure' },
        LOGIN_DIR
      ),
      equal: credentials.claudeKeychainService(
        { CLAUDE_SECURESTORAGE_CONFIG_DIR: LOGIN_DIR },
        LOGIN_DIR
      ),
      unset: credentials.claudeKeychainService({}, LOGIN_DIR)
    }
  };

  // -------------------------------------------------------------------------
  // 19. THE CHOICE CARRIES ITS REASON, AND NO ROW CARRIES A SIZE (Phase 287,
  //     narrowed by Phase 304).
  //
  //     Phase 287 drove a `tooLarge` field through the shipping
  //     `listLoginsAsking` here and read four words out of the words file.
  //     Since Phase 304 Tortie's own store is a sealed file with no ceiling,
  //     so the ONLY store that can refuse for size is the agent's own keychain
  //     entry, that refusal happens at a click and nowhere else, and no row has
  //     anything to carry: the field, its drawing rule and its label are gone
  //     with the case. What is read here is that the two sentences that
  //     survive are the words file's own, by value, so a word changed anywhere
  //     is one reading, and that the row shape carries no such field, which is
  //     asked of the shipping `listLoginsAsking` over an ask that answers one.
  // -------------------------------------------------------------------------
  {
    const capRoot = mkdtempSync(join(tmpdir(), 'p287-gate-'));
    capRoots.push(capRoot);
    store.addLogin(capRoot, 'claude', 'Grown');
    // AN ASK THAT ANSWERS A SIZE FIELD ANYWAY, as a reader from before Phase
    // 304 would. The snapshot must not carry it: the shipping list composes
    // its rows from the four facts it knows and nothing an ask smuggles in.
    const capAsk = async (
      _provider: 'claude' | 'codex',
      dir: string | null
    ): Promise<{ present: boolean; email: string | null; kept: boolean; restores: boolean }> =>
      ({
        present: true,
        email: dir === null ? 'own@example.com' : 'grown@example.com',
        kept: dir !== null,
        restores: dir !== null,
        tooLarge: true
      }) as { present: boolean; email: string | null; kept: boolean; restores: boolean };
    const rows = (await store.listLoginsAsking(capRoot, capAsk)).logins.filter(
      (row) => row.provider === 'claude'
    );
    const copyText = readFileSync(resolve(COPY, 'login-copy.ts'), 'utf8');
    out['tooLarge'] = {
      rowsRead: rows.length,
      // No row carries a size, whatever the ask answered.
      rowCarriesSize: rows.some((row) => 'tooLarge' in row),
      // The words file exports no drawing rule and no label for one.
      drawsRule: typeof (copy as { loginDrawsTooLarge?: unknown }).loginDrawsTooLarge,
      label: typeof (copy as { LOGIN_TOO_LARGE?: unknown }).LOGIN_TOO_LARGE,
      signedInTail: typeof (copy as { LOGIN_TOO_LARGE_SIGNED_IN?: unknown }).LOGIN_TOO_LARGE_SIGNED_IN,
      // The two sentences that survive, by value.
      words: {
        refused: copy.LOGIN_TOO_LARGE_SENTENCE,
        running: copy.LOGIN_TOO_LARGE_RUNNING
      },
      // And the words file names no size field in its code.
      copyNamesTooLarge: /\btooLarge\b/.test(copyText.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1'))
    };
  }

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
  for (const dir of capRoots) rmSync(dir, { recursive: true, force: true });
}

process.stdout.write(`${JSON.stringify(out)}\n`);
