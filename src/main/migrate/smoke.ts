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
    log('1/10 the production guard still refuses to migrate on this machine');
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
    // …and it refuses for the OTHER reason too — the one that holds for an
    // ordinary launch, where userData is the default location. Until the
    // rename lands, the legacy directory IS the target.
    const unrenamed = decideMigrationSite({
      appDataDir: app.getPath('appData'),
      appName: LEGACY_APP_NAME,
      userDataDir: join(app.getPath('appData'), LEGACY_APP_NAME)
    });
    check(
      !unrenamed.migrate && unrenamed.reason === 'name-unchanged',
      `an ordinary launch would migrate today: ${JSON.stringify(unrenamed)}`
    );
    log(`      → an ordinary launch: ${unrenamed.migrate ? '' : unrenamed.detail}`);

    // -----------------------------------------------------------------------
    log('2/10 building a populated legacy install (never a copy of the real one)');
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
      `      → 3 manifest rows (2 live on -L ${tmux.TMUX_SOCKET}, 1 restorable, ` +
        '1 captured), snapshots, settings, hotkeys, tip flags, 256 KB of cache'
    );

    // -----------------------------------------------------------------------
    log('3/10 migrating');
    const sourceRows = readAllSessions(dbPath);
    const before = fingerprint(legacyDir);
    const result = migrateUserData({ legacyDir, targetDir });
    check(
      result.status === 'migrated',
      `migration did not run: ${result.status}/${result.reason} — ${result.summary}`
    );
    log(`      → ${result.summary}`);

    // -----------------------------------------------------------------------
    log('4/10 the original is intact and kept as the backup');
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
    log('5/10 every manifest row survived with identical values');
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
    log('6/10 the live tmux sessions are still adoptable from the migrated copy');
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
    log('7/10 settings, hotkeys and one-time-tip flags came across');
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
    log('8/10 the captured session heals the dead bundle path (hazard 4)');
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
    log('9/10 the second launch is a no-op');
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
    log('10/10 cleanup');
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
