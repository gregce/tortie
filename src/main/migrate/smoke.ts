/**
 * GMUX_SMOKE=migrate — the rename upgrade, driven for real (Phase 16.5a).
 *
 * The unit tests in __tests__/userdata.test.ts prove the copy against real
 * directories and a real SQLite manifest. They cannot prove the two things
 * this phase is actually frightening about, because both need the live
 * machine:
 *
 *  1. **The sessions still come back.** A migrated manifest is worth nothing
 *     if the rows it carries no longer bind to the tmux sessions that are
 *     alive on the private socket right now. So this harness creates REAL
 *     `zz-`prefixed sessions on `-L gmux`, stamps them with `@gmux-id`s that
 *     only exist in the OLD manifest, migrates, and then reconciles the
 *     MIGRATED copy against the live server — the same call the app makes at
 *     boot. Adoption is measured, not assumed.
 *  2. **A captured session's conversation still comes back.** Every captured
 *     row records the ABSOLUTE path of the specstory binary inside the app
 *     bundle, and the rename invalidates all of them at once (measured
 *     behaviour before Phase 15.1: exit 127, no conversation). This harness
 *     builds exactly that row — bin under `/Applications/gmux.app/…`, which
 *     does not exist — and calls the real `armableResumeArgv` to prove the
 *     heal covers the RENAME case specifically.
 *
 * SAFETY, because this runs on a machine with the user's real work on it:
 *  - it never reads or writes the real userData — everything happens under a
 *    fresh `mkdtemp` scratch root, and the fixture is BUILT, never copied
 *    from the user's install;
 *  - the only thing it touches outside that root is the private tmux socket,
 *    where it creates `zz-migrate-<pid>-…` sessions and kills exactly those
 *    (by immutable `$-id`) at the end. No other session is listed for
 *    modification, renamed, or killed;
 *  - it asserts, before anything else, that the production guard still refuses
 *    to migrate on this machine.
 */

import { app } from 'electron';
import { createHash } from 'node:crypto';
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
import { join, relative } from 'node:path';
import Database from 'better-sqlite3';
import { ManifestStore, type ManifestSessionRecord } from '../manifest';
import type { LiveTmuxSession } from '../manifest';
// Phase 71. The schema 12 fixture step 11 builds, so the migration a person's
// upgrade actually runs is watched running inside the app's own process.
import {
  MANIFEST_SCHEMA_IDENTITY,
  MANIFEST_SCHEMA_VERSION,
  MIGRATIONS
} from '../manifest/schema';
import { stampSchemaVersion } from '../db/schema-version';
import { runMigrations } from '../db/sqlite';
import { armableResumeArgv } from '../restore';
import { wrapWithRecord, type SpecstoryCaptureRecord } from '../specstory';
import * as tmux from '../tmux';
import {
  LEGACY_APP_NAME,
  decideMigrationSite,
  migrateUserData,
  readMigrationMarker
} from './userdata';

const NEW_APP_NAME = 'Tortie';
/** The path every captured row recorded under the OLD bundle name. */
const OLD_BUNDLE_BIN = '/Applications/gmux.app/Contents/Resources/bin/specstory';

function log(step: string): void {
  console.log(`[gmux-smoke] ${step}`);
}

function check(ok: boolean, what: string): void {
  if (!ok) throw new Error(what);
}

function sha(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** relpath → sha256:size:mtime for every regular file under `dir`. */
function fingerprint(dir: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile()) {
        const st = statSync(p);
        out.set(relative(dir, p), `${sha(p)}:${st.size}:${st.mtimeMs}`);
      }
    }
  };
  walk(dir);
  return out;
}

function readAllSessions(dbPath: string): Record<string, unknown>[] {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  const rows = db.prepare('SELECT * FROM sessions ORDER BY id').all();
  db.close();
  return rows as Record<string, unknown>[];
}

/** `PRAGMA user_version`, which is the number a migration moves. */
function readUserVersion(dbPath: string): number {
  const db = new Database(dbPath, { readonly: true, fileMustExist: true });
  try {
    return Number((db.pragma('user_version', { simple: true }) as number) ?? -1);
  } finally {
    db.close();
  }
}

/**
 * Migrate a REAL install into a scratch target and report what happened.
 *
 * The assertions here are deliberately weaker than the fixture's, and for an
 * honest reason: the source may be a profile a running app is writing to, so
 * "every byte identical afterwards" is not a property of the migration, it is
 * a property of nobody else touching the machine. What IS asserted is what the
 * user would lose if it were false — every session row that existed when the
 * copy started is in the copy, and settings came across unchanged.
 */
async function rehearseAgainstRealInstall(
  legacyDir: string,
  targetDir: string
): Promise<void> {
  log(`+ real-scale rehearsal against ${legacyDir}`);
  const dbPath = join(legacyDir, LEGACY_APP_NAME, 'manifest.db');
  check(existsSync(dbPath), `no manifest at ${dbPath}`);
  const walPath = `${dbPath}-wal`;
  const walBytes = existsSync(walPath) ? statSync(walPath).size : 0;
  const idsBefore = readAllSessions(dbPath).map((r) => String(r['id']));
  const settingsPath = join(legacyDir, 'settings.json');
  const settingsHash = existsSync(settingsPath) ? sha(settingsPath) : null;

  const started = Date.now();
  const result = migrateUserData({ legacyDir, targetDir });
  const elapsed = Date.now() - started;
  check(
    result.status === 'migrated',
    `rehearsal did not migrate: ${result.status}/${result.reason} — ${result.summary}`
  );

  const copiedIds = new Set(
    readAllSessions(join(targetDir, LEGACY_APP_NAME, 'manifest.db')).map((r) =>
      String(r['id'])
    )
  );
  const missing = idsBefore.filter((id) => !copiedIds.has(id));
  check(
    missing.length === 0,
    `${missing.length} session row(s) did not survive: ${missing.join(', ')}`
  );
  if (settingsHash !== null) {
    check(
      sha(join(targetDir, 'settings.json')) === settingsHash,
      'settings.json changed in the copy'
    );
    check(sha(settingsPath) === settingsHash, 'settings.json changed at the SOURCE');
  }
  const dbEvidence = result.databases.find(
    (d) => d.file === `${LEGACY_APP_NAME}/manifest.db`
  );
  check(dbEvidence?.ok === true, 'the real manifest did not verify');
  log(
    `      → ${idsBefore.length} sessions (WAL ${(walBytes / 1024).toFixed(0)} KB, ` +
      `${dbEvidence?.method}), ${result.files} files, ` +
      `${(result.bytes / (1024 * 1024)).toFixed(1)} MB, ${elapsed} ms; ` +
      `skipped ${result.skipped.length} regenerable top-level entries`
  );
  for (const w of result.warnings) log(`      ! ${w}`);
  rmSync(targetDir, { recursive: true, force: true });
}

export async function runMigrateSmoke(): Promise<void> {
  const watchdog = setTimeout(() => {
    console.error('[gmux-smoke] FAIL: 120s watchdog expired');
    app.exit(1);
  }, 120_000);
  watchdog.unref?.();

  const scratch = mkdtempSync(join(tmpdir(), 'gmux-migrate-smoke-'));
  const appData = join(scratch, 'Application Support');
  const legacyDir = join(appData, LEGACY_APP_NAME);
  const targetDir = join(appData, NEW_APP_NAME);
  const created: string[] = []; // tmux $-ids this harness owns

  try {
    // -----------------------------------------------------------------------
    log('1/12 the production guard still refuses to migrate on this machine');
    const live = decideMigrationSite({
      appDataDir: app.getPath('appData'),
      appName: app.getName(),
      userDataDir: app.getPath('userData'),
      env: process.env
    });
    check(
      !live.migrate,
      `the guard would have migrated the REAL profile: ${JSON.stringify(live)}`
    );
    log(`      → ${live.migrate ? '' : live.reason}: ${live.migrate ? '' : live.detail}`);
    // …and, now that the rename has LANDED (Phase 16.5), the arithmetic goes
    // the other way for an ordinary launch: same app name, but userData at its
    // default location. This is the assertion that the rename is really wired
    // up — if `app.getName()` ever drifts back to the legacy name, or someone
    // "helpfully" pins userData, the user's manifest silently stops crossing
    // over and only this line notices. Pure path arithmetic; nothing is moved.
    const realAppData = app.getPath('appData');
    const ordinary = decideMigrationSite({
      appDataDir: realAppData,
      appName: app.getName(),
      userDataDir: join(realAppData, app.getName())
    });
    check(
      app.getName() !== LEGACY_APP_NAME,
      `the app still calls itself "${LEGACY_APP_NAME}" — the rename is not wired up`
    );
    check(
      ordinary.migrate &&
        ordinary.site.legacyDir === join(realAppData, LEGACY_APP_NAME) &&
        ordinary.site.targetDir === join(realAppData, app.getName()),
      `an ordinary launch would NOT carry the data across: ${JSON.stringify(ordinary)}`
    );
    log(
      `      → an ordinary launch: ${LEGACY_APP_NAME} -> ${app.getName()}, ` +
        'the real profile would be carried across (not run here)'
    );
    // The legacy name must ALSO still be recognised as a no-op for anyone
    // running an un-renamed build against the same data.
    const unrenamed = decideMigrationSite({
      appDataDir: realAppData,
      appName: LEGACY_APP_NAME,
      userDataDir: join(realAppData, LEGACY_APP_NAME)
    });
    check(
      !unrenamed.migrate && unrenamed.reason === 'name-unchanged',
      `an un-renamed build would migrate onto itself: ${JSON.stringify(unrenamed)}`
    );

    // -----------------------------------------------------------------------
    log('2/12 building a populated legacy install (never a copy of the real one)');
    mkdirSync(join(legacyDir, LEGACY_APP_NAME, 'snapshots'), { recursive: true });
    mkdirSync(join(legacyDir, 'Local Storage', 'leveldb'), { recursive: true });
    mkdirSync(join(legacyDir, 'Cache', 'Cache_Data'), { recursive: true });
    writeFileSync(
      join(legacyDir, 'Cache', 'Cache_Data', 'data_0'),
      Buffer.alloc(256 * 1024, 7)
    );
    writeFileSync(
      join(legacyDir, 'Local Storage', 'leveldb', '000003.log'),
      'gmux.tipShown.first-quit=1'
    );
    writeFileSync(
      join(legacyDir, 'settings.json'),
      JSON.stringify({
        version: 1,
        settings: {
          defaultAgent: 'claude',
          hotkeys: { claude: 'Shift+Cmd+C', codex: 'Shift+Cmd+X' },
          scrollbackLines: 25000
        }
      })
    );

    const dbPath = join(legacyDir, LEGACY_APP_NAME, 'manifest.db');
    const store = new ManifestStore(dbPath);
    const home = app.getPath('home');
    store.upsertProject({ id: 'zzmig-p1', path: home, name: 'home' });
    store.upsertProject({
      id: 'zzmig-p2',
      path: join(home, 'gmux'),
      name: 'gmux'
    });
    const shell = process.env['SHELL'] ?? '/bin/zsh';
    const capture: SpecstoryCaptureRecord = {
      enabled: true,
      bin: OLD_BUNDLE_BIN,
      binVersion: '2.8.0',
      provider: 'claude',
      exitCodeFidelity: 'exact',
      agentArgv: ['claude', '--dangerously-skip-permissions']
    };
    const capturedResume = wrapWithRecord(capture, [
      'claude',
      '--resume',
      '11111111-2222-3333-4444-555555555555'
    ]);
    check(capturedResume !== null, 'could not compose a wrapped resume argv');

    // The server has to exist before a session can be created on it. This used
    // to be true by accident, because this harness ran on the operator's own
    // socket and that server is always up. It has its own socket now, so it
    // starts its own server, exactly as the app does.
    await tmux.ensureServer();

    const rows: ManifestSessionRecord[] = [];
    const now = Date.now();
    for (const [i, kind] of ['plain', 'captured'].entries()) {
      const id = `zzmig-${process.pid}-${kind}`;
      const displayName = `zz-migrate-${process.pid}-${kind}`;
      const info = await tmux.createSession({
        displayName,
        cwd: home,
        argv: [shell],
        env: tmux.managedPaneEnv(id)
      });
      created.push(info.sessionId);
      await tmux.setSessionOption(info.sessionId, '@gmux-id', id);
      rows.push(
        store.insertSession({
          id,
          name: displayName,
          tmuxName: info.tmuxName,
          projectPath: home,
          cwd: home,
          agent: 'claude',
          status: 'running',
          createdAt: now + i,
          lastSeen: now + i,
          argv: ['claude'],
          ...(kind === 'captured'
            ? { specstory: capture, resumeArgv: capturedResume as string[] }
            : { resumeArgv: ['claude', '--resume', id] }),
          env: tmux.managedPaneEnv(id)
        })
      );
    }
    // A third row with NO live session: the post-reboot restore candidate.
    const restorableId = `zzmig-${process.pid}-restorable`;
    rows.push(
      store.insertSession({
        id: restorableId,
        name: `zz-migrate-${process.pid}-restorable`,
        tmuxName: `zz-migrate-${process.pid}-restorable`,
        projectPath: home,
        cwd: home,
        agent: 'claude',
        status: 'restorable',
        createdAt: now + 9,
        lastSeen: now + 9,
        argv: ['claude'],
        resumeArgv: ['claude', '--resume', restorableId]
      })
    );
    for (const r of rows) {
      writeFileSync(
        join(legacyDir, LEGACY_APP_NAME, 'snapshots', `${r.id}.txt`),
        `pretend scrollback for ${r.name}\n`.repeat(200)
      );
    }
    store.close();
    log(
      `      → 3 manifest rows (2 live on -L ${tmux.activeTmuxSocket()}, 1 restorable, ` +
        '1 captured), snapshots, settings, hotkeys, tip flags, 256 KB of cache'
    );

    // -----------------------------------------------------------------------
    log('3/12 migrating');
    const sourceRows = readAllSessions(dbPath);
    const before = fingerprint(legacyDir);
    const result = migrateUserData({ legacyDir, targetDir });
    check(
      result.status === 'migrated',
      `migration did not run: ${result.status}/${result.reason} — ${result.summary}`
    );
    log(`      → ${result.summary}`);

    // -----------------------------------------------------------------------
    log('4/12 the original is intact and kept as the backup');
    const after = fingerprint(legacyDir);
    const shm = `${LEGACY_APP_NAME}/manifest.db-shm`;
    before.delete(shm);
    after.delete(shm);
    check(
      before.size === after.size &&
        [...before].every(([k, v]) => after.get(k) === v),
      'the legacy directory changed during the migration'
    );
    log(`      → ${after.size} files byte-identical, mtimes unchanged`);

    // -----------------------------------------------------------------------
    log('5/12 every manifest row survived with identical values');
    const targetDb = join(targetDir, LEGACY_APP_NAME, 'manifest.db');
    const copiedRows = readAllSessions(targetDb);
    check(
      JSON.stringify(copiedRows) === JSON.stringify(sourceRows),
      'migrated manifest rows differ from the originals'
    );
    const dbEvidence = result.databases.find(
      (d) => d.file === `${LEGACY_APP_NAME}/manifest.db`
    );
    check(dbEvidence?.ok === true, 'manifest verification did not pass');
    check(
      dbEvidence?.source['sessions'] === 3 && dbEvidence?.source['projects'] === 2,
      `row counts are not the fixture's: ${JSON.stringify(dbEvidence?.source)}`
    );
    check(
      result.skipped.includes('Cache'),
      'the Chromium cache was not recognised as regenerable'
    );
    log(
      `      → ${copiedRows.length} sessions, ${dbEvidence?.source['projects'] ?? 0} ` +
        `projects (${dbEvidence?.method})`
    );

    // -----------------------------------------------------------------------
    log('6/12 the live tmux sessions are still adoptable from the migrated copy');
    const migrated = new ManifestStore(targetDb);
    const liveInfos = await tmux.listSessions();
    const liveList: LiveTmuxSession[] = liveInfos.map((info) => ({
      tmuxId: info.sessionId,
      tmuxName: info.tmuxName,
      ...(info.gmuxId !== undefined ? { gmuxId: info.gmuxId } : {})
    }));
    const reconciled = migrated.reconcile(liveList);
    const aliveIds = reconciled.alive.map((r) => r.id).sort();
    check(
      aliveIds.length === 2 &&
        aliveIds[0] === `zzmig-${process.pid}-captured` &&
        aliveIds[1] === `zzmig-${process.pid}-plain`,
      `expected 2 adopted sessions, got ${JSON.stringify(aliveIds)}`
    );
    for (const id of aliveIds) {
      const bound = reconciled.bindings.get(id);
      check(
        bound !== undefined && created.includes(bound),
        `"${id}" did not bind to the tmux session this harness created`
      );
    }
    check(
      reconciled.restorable.some((r) => r.id === restorableId),
      'the restorable row was not offered for restore after the migration'
    );
    log(
      `      → adopted ${aliveIds.length} live sessions by @gmux-id ` +
        `(${aliveIds.map((id) => reconciled.bindings.get(id)).join(', ')}), ` +
        '1 restorable'
    );

    // -----------------------------------------------------------------------
    log('7/12 settings, hotkeys and one-time-tip flags came across');
    const settings = JSON.parse(
      readFileSync(join(targetDir, 'settings.json'), 'utf8')
    ) as { settings: { hotkeys: Record<string, string>; defaultAgent: string } };
    check(
      settings.settings.hotkeys['claude'] === 'Shift+Cmd+C' &&
        settings.settings.hotkeys['codex'] === 'Shift+Cmd+X' &&
        settings.settings.defaultAgent === 'claude',
      'settings or hotkeys did not survive'
    );
    check(
      readFileSync(
        join(targetDir, 'Local Storage', 'leveldb', '000003.log'),
        'utf8'
      ) === 'gmux.tipShown.first-quit=1',
      'the localStorage tip flags did not survive'
    );
    check(
      !existsSync(join(targetDir, 'Cache')),
      'the regenerable Chromium cache rode along'
    );
    const snapshot = join(
      targetDir,
      LEGACY_APP_NAME,
      'snapshots',
      `${restorableId}.txt`
    );
    check(existsSync(snapshot), 'snapshots did not survive');
    log('      → hotkeys, default agent, tip flags and snapshots intact; cache left behind');

    // -----------------------------------------------------------------------
    log('8/12 the captured session heals the dead bundle path (hazard 4)');
    check(
      !existsSync(OLD_BUNDLE_BIN),
      `${OLD_BUNDLE_BIN} exists on this machine — the rename case cannot be proved here`
    );
    const capturedRow = migrated.getSession(
      `zzmig-${process.pid}-captured`
    ) as ManifestSessionRecord;
    check(
      (capturedRow.resumeArgv ?? []).includes(OLD_BUNDLE_BIN),
      'the fixture did not record the old bundle path'
    );
    const armed = await armableResumeArgv(capturedRow);
    check(armed.length > 0, 'nothing would be armed for the captured session');
    check(
      armed[0] !== OLD_BUNDLE_BIN,
      `restore would still arm the dead binary: ${armed.join(' ')}`
    );
    const stillCaptured = armed[0] !== 'claude';
    check(
      stillCaptured ? existsSync(armed[0] as string) : true,
      `re-armed under a binary that does not exist: ${armed[0]}`
    );
    check(
      armed.join(' ').includes('--resume 11111111-2222-3333-4444-555555555555') ||
        armed.includes('11111111-2222-3333-4444-555555555555'),
      `the conversation id was lost from the armed line: ${armed.join(' ')}`
    );
    log(
      stillCaptured
        ? `      → re-armed under ${armed[0]} — the conversation comes back, still captured`
        : '      → no SpecStory CLI here, so the bare agent resume was armed — ' +
          'the conversation comes back, uncaptured'
    );
    migrated.close();

    // -----------------------------------------------------------------------
    log('9/12 the second launch is a no-op');
    const second = migrateUserData({ legacyDir, targetDir, log: () => {} });
    check(
      second.status === 'skipped' && second.reason === 'already-migrated',
      `second run did something: ${second.status}/${second.reason}`
    );
    const marker = readMigrationMarker(targetDir);
    check(marker?.status === 'complete', 'the completion marker is missing');
    check(
      !existsSync(`${targetDir}.migrating`),
      'a staging directory was left behind'
    );
    log(`      → ${second.reason}; marker records ${marker?.entries.length} entries`);

    // -----------------------------------------------------------------------
    // Phase 19 item 10. Everything above this line drives the SUCCESS path,
    // and until now so did every case in the unit suite. Research 33 §3.1
    // proved by probe that the failure path was silent and one-way: the copy
    // threw, the user was told nothing, the app's first boot created
    // `<userData>/gmux/`, and every launch after that answered
    // skipped / target-has-data for good. This stage drives the whole shape.
    log('10/12 a failed migration records itself and stays armed');
    const failRoot = join(scratch, 'failure-path');
    const failLegacy = join(failRoot, LEGACY_APP_NAME);
    const failTarget = join(failRoot, NEW_APP_NAME);
    mkdirSync(join(failLegacy, LEGACY_APP_NAME), { recursive: true });
    writeFileSync(join(failLegacy, 'settings.json'), '{"version":1}');
    const failStore = new ManifestStore(
      join(failLegacy, LEGACY_APP_NAME, 'manifest.db')
    );
    failStore.insertSession({
      id: `zzmig-${process.pid}-failpath`,
      name: `zz-migrate-${process.pid}-failpath`,
      tmuxName: `zz-migrate-${process.pid}-failpath`,
      projectPath: home,
      cwd: home,
      agent: 'claude',
      status: 'restorable',
      createdAt: Date.now(),
      lastSeen: Date.now(),
      argv: ['claude'],
      resumeArgv: ['claude', '--resume', 'failpath']
    });
    failStore.close();

    // One unreadable file is all it takes, and it is not an exotic fixture: a
    // Chromium file with odd permissions or a partial backup restore does it.
    const unreadable = join(failLegacy, 'Preferences');
    writeFileSync(unreadable, '{"profile":{}}');
    chmodSync(unreadable, 0o000);
    let readable = true;
    try {
      readFileSync(unreadable);
    } catch {
      readable = false;
    }
    if (readable) {
      log('      → skipped: this process can read a mode 000 file, so the copy cannot be made to fail');
    } else {
      const failed = migrateUserData({
        legacyDir: failLegacy,
        targetDir: failTarget,
        log: () => {}
      });
      check(
        failed.status === 'failed',
        `the copy did not fail as arranged: ${failed.status}/${failed.reason}`
      );
      const failMarker = readMigrationMarker(failTarget);
      check(
        failMarker?.status === 'failed' && failMarker.attempts === 1,
        'the failure was not recorded in the target, so the retry cannot be armed'
      );
      check(
        !existsSync(join(failTarget, LEGACY_APP_NAME, 'manifest.db')),
        'a failed migration published something'
      );

      // The app boots anyway and creates its own payload. This is the moment
      // that used to make the state permanent.
      mkdirSync(join(failTarget, LEGACY_APP_NAME), { recursive: true });
      writeFileSync(join(failTarget, LEGACY_APP_NAME, 'manifest.db'), '');
      chmodSync(unreadable, 0o644);

      const retry = migrateUserData({
        legacyDir: failLegacy,
        targetDir: failTarget,
        log: () => {}
      });
      check(
        retry.status === 'migrated',
        `the retry stood down instead of running: ${retry.status}/${retry.reason}`
      );
      check(
        readAllSessions(join(failTarget, LEGACY_APP_NAME, 'manifest.db')).length === 1,
        'the retry published a manifest without the session row'
      );
      check(
        retry.movedAside.includes(LEGACY_APP_NAME),
        'what the app wrote between the failure and the retry was not kept'
      );
      log(
        `      → failed (${failed.reason}), recorded, retried, ` +
          'and the session row came across with the earlier payload set aside'
      );
    }

    // -----------------------------------------------------------------------
    // Optional real-scale rehearsal. `GMUX_MIGRATE_FIXTURE=<dir>` points the
    // migration at an ACTUAL install — the real one is fine, and is the point:
    // the copy only ever READS its source, so this measures the upgrade
    // against real row counts, a real multi-megabyte WAL, real snapshots and
    // (if the app is open) a real concurrent writer. The copy is made into the
    // scratch root and deleted immediately after.
    const realFixture = process.env['GMUX_MIGRATE_FIXTURE'];
    if (realFixture !== undefined && realFixture !== '') {
      await rehearseAgainstRealInstall(realFixture, join(scratch, 'RealTortie'));
    }

    // -----------------------------------------------------------------------
    // -----------------------------------------------------------------------
    // PHASE 71. Migration 013, run by the real store inside a real Electron
    // process against the built bundle.
    //
    // WHY IT IS HERE AND NOT ONLY IN A UNIT TEST. The unit test builds the same
    // schema 12 file and it is thorough, but it runs under vitest, where
    // `electron` is a stub and better-sqlite3 is loaded by the Node vitest
    // spawned. The thing a person's upgrade actually does is open their file
    // with the native module inside the shipped app, on the app's own SQLite
    // build, with the app's own `app.getPath` behind it. That is what this leg
    // is: the same file shape, opened by `new ManifestStore(path)`, which is the
    // exact call the app makes at boot.
    //
    // It uses this harness rather than a new one because this harness already
    // exists to answer "does an old file survive the new build", and a person
    // upgrading gets the rename and the schema change in the same launch.
    log('11/12 a manifest at schema 12 gains machine_id when the app opens it');
    {
      const oldDir = join(scratch, 'schema12');
      mkdirSync(oldDir, { recursive: true });
      const oldPath = join(oldDir, 'manifest.db');
      const carried = {
        id: 'zzmig-schema12',
        name: 'the one that predates machines',
        tmux_name: 'zz-schema12',
        project_path: home,
        cwd: home,
        agent: 'claude',
        argv: JSON.stringify(['/opt/homebrew/bin/claude', '--model', 'opus']),
        resume_argv: JSON.stringify(['claude', '--resume', 'zzmig-schema12']),
        status: 'restorable',
        created_at: 1_700_000_000_000,
        last_seen: 1_700_000_500_000
      };
      const old = new Database(oldPath);
      try {
        old.pragma('journal_mode = WAL');
        runMigrations(
          old,
          MIGRATIONS.filter((one) => one.name !== '013-machine-id')
        );
        stampSchemaVersion(
          old,
          { ...MANIFEST_SCHEMA_IDENTITY, version: 12 },
          '0.33.0'
        );
        const names = Object.keys(carried);
        old
          .prepare(
            `INSERT INTO sessions (${names.join(', ')}) VALUES (${names
              .map((one) => `@${one}`)
              .join(', ')})`
          )
          .run(carried);
      } finally {
        old.close();
      }
      check(
        readUserVersion(oldPath) === 12,
        'the fixture was not left at schema 12'
      );
      check(
        !readAllSessions(oldPath).some((r) =>
          Object.hasOwn(r, 'machine_id')
        ),
        'the fixture already had the column, so nothing would be migrated'
      );

      // The one call the app makes at boot, on the real native module.
      const upgraded = new ManifestStore(oldPath);
      try {
        const row = upgraded.getSession('zzmig-schema12');
        check(row !== null, 'the row did not survive migration 013');
        check(
          row?.machineId === 'local',
          `the carried row reads machineId ${String(row?.machineId)} and every ` +
            'row an older build wrote is on this Mac'
        );
        check(
          row?.name === carried.name && row?.status === 'restorable',
          'migration 013 changed a value it does not own'
        );
        check(
          JSON.stringify(row?.resumeArgv) === carried.resume_argv,
          'the resume line did not survive migration 013'
        );
        const fresh = upgraded.insertSession({
          id: 'zzmig-after-013',
          name: 'created after the migration',
          tmuxName: 'zz-after-013',
          projectPath: home,
          cwd: home,
          agent: 'shell',
          status: 'running',
          createdAt: Date.now(),
          lastSeen: Date.now(),
          argv: ['/bin/zsh']
        });
        check(
          fresh.machineId === 'local',
          `a row created after the migration reads ${String(fresh.machineId)}`
        );
      } finally {
        upgraded.close();
      }
      check(
        readUserVersion(oldPath) === MANIFEST_SCHEMA_VERSION,
        `the migrated file reads user_version ${String(readUserVersion(oldPath))}`
      );
      log(
        `      → user_version 12 to ${String(MANIFEST_SCHEMA_VERSION)}, the ` +
          'carried row reads local with its resume line intact, and a row ' +
          'created after it reads local too'
      );
    }

    // -----------------------------------------------------------------------
    log('12/12 cleanup');
    for (const id of created) {
      await tmux.killSession(id).catch(() => undefined);
    }
    created.length = 0;
    rmSync(scratch, { recursive: true, force: true });
    log('PASS — a populated gmux install crossed the rename with everything intact');
    clearTimeout(watchdog);
    app.exit(0);
  } catch (err) {
    console.error(`[gmux-smoke] FAIL: ${(err as Error).message}`);
    for (const id of created) {
      await tmux.killSession(id).catch(() => undefined);
    }
    rmSync(scratch, { recursive: true, force: true });
    clearTimeout(watchdog);
    app.exit(1);
  }
}
