/**
 * GMUX_SMOKE=refusal — drive the "this copy is older than your session list"
 * screen inside a real Electron process (Phase 21 fix round, research 27 §4.4).
 *
 * WHY THIS EXISTS. Phase 21 shipped the refusal and proved it protects the
 * file. It did not ship the screen. A verifier drove the real app against a
 * manifest stamped `min_compatible_version` 9 and read the result: the empty
 * home screen, headed "Sessions you start keep running even when Tortie is
 * closed", offering Open project and New project, with the real reason
 * truncated inside a corner toast. The data was safe and the person was told
 * their sessions were gone.
 *
 * A unit test can check the words. It cannot check that a person is shown
 * them, that Reveal does not dismiss the screen, or that no window opens
 * behind it. Those are properties of a running Electron app, so this runs in
 * one.
 *
 * WHAT IS REAL HERE. The manifest is a real SQLite file this build wrote and
 * then stamped forward. `manifestRefusal` and `presentManifestRefusal` are the
 * real ones from the built bundle. The ONE thing replaced is
 * `dialog.showMessageBox`, because that is the person, and a harness cannot be
 * the person. `app.exit` and `shell.showItemInFolder` are recorded rather than
 * performed, so the run can go on to check what happened.
 *
 * SAFETY. It refuses to run unless the profile is isolated, using the same
 * check the fault harness makes, from the same module. It never opens the real
 * manifest and it creates no tmux session at all.
 */

import { BrowserWindow, app, dialog, shell } from 'electron';
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assertHarnessIsolation } from '../harness/isolation';
import { manifestRefusal } from './refusal';
import { presentManifestRefusal } from '../notice/refusal-screen';
import {
  MANIFEST_SCHEMA_VERSION,
  ManifestStore,
  defaultManifestDbPath
} from './store';

function log(line: string): void {
  console.log(`[gmux-refusal] ${line}`);
}

/** Stop the run. Throws, so nothing after a failure prints a pass shaped line. */
function fail(message: string): never {
  throw new Error(message);
}

interface SeenBox {
  message: string;
  detail: string;
  buttons: string[];
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

/** A real manifest this build wrote, then stamped as needing a later build. */
function seedManifestFromTheFuture(dbPath: string, needs: number): void {
  mkdirSync(dirname(dbPath), { recursive: true });
  const store = new ManifestStore(dbPath);
  try {
    store.insertSession({
      id: '00000021-0000-4000-8000-000000000021',
      name: 'work that is still running',
      tmuxName: 'work',
      projectPath: '/tmp/project',
      cwd: '/tmp/project',
      agent: 'shell',
      argv: ['/bin/zsh', '-l'],
      status: 'running',
      createdAt: 1_700_000_000_000,
      lastSeen: 1_700_000_000_000
    });
  } finally {
    store.close();
  }
  const db = new Database(dbPath);
  try {
    db.prepare(
      "INSERT INTO meta (key, value) VALUES ('min_compatible_version', ?) " +
        'ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    ).run(String(needs));
    db.pragma(`user_version = ${String(needs)}`);
  } finally {
    db.close();
  }
}

export async function runRefusalSmoke(): Promise<void> {
  try {
    assertHarnessIsolation('GMUX_REFUSAL_ROOT');
    await app.whenReady();

    const dbPath = defaultManifestDbPath();
    if (existsSync(dbPath)) fail(`${dbPath} already exists in a fresh profile`);
    const needs = MANIFEST_SCHEMA_VERSION + 1;
    seedManifestFromTheFuture(dbPath, needs);
    const before = sha256(dbPath);
    log(
      `seeded a session list that needs format ${String(needs)}; this build ` +
        `understands ${String(MANIFEST_SCHEMA_VERSION)}`
    );

    // --- 1. The refusal fires, read only, before anything is opened ---------
    const refusal = manifestRefusal(dbPath);
    if (refusal === null) fail('the refusal did not fire on a manifest from the future');
    log(`refused: ${refusal.name}`);

    // --- 2. The screen. Reveal first, then Quit -----------------------------
    const seen: SeenBox[] = [];
    const revealed: string[] = [];
    const exits: number[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const realBox = (dialog as any).showMessageBox;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const realReveal = (shell as any).showItemInFolder;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const realExit = (app as any).exit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (dialog as any).showMessageBox = (options: {
      message?: string;
      detail?: string;
      buttons?: string[];
    }) => {
      seen.push({
        message: options.message ?? '',
        detail: options.detail ?? '',
        buttons: options.buttons ?? []
      });
      // The person clicks Reveal on the first box. That must NOT dismiss the
      // screen: looking at the folder is not a decision. Then they Quit.
      return Promise.resolve({
        response: seen.length === 1 ? 1 : 0,
        checkboxChecked: false
      });
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (shell as any).showItemInFolder = (p: string) => revealed.push(p);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (app as any).exit = (code: number) => exits.push(code);

    try {
      await presentManifestRefusal(refusal);
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dialog as any).showMessageBox = realBox;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (shell as any).showItemInFolder = realReveal;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (app as any).exit = realExit;
    }

    if (seen.length !== 2) {
      fail(
        `${String(seen.length)} box(es) were shown, expected 2: Reveal must not ` +
          'dismiss the screen'
      );
    }
    const box = seen[0];
    if (box === undefined) fail('no box was shown at all');
    for (const required of [
      'Your sessions are safe and they are still running.',
      `understands format ${String(MANIFEST_SCHEMA_VERSION)}`,
      `needs ${String(needs)} or newer`,
      'It has changed nothing.'
    ]) {
      if (!box.detail.includes(required)) {
        fail(`the screen does not say "${required}". It says:\n${box.detail}`);
      }
    }
    if (box.buttons.join(' | ') !== 'Quit | Reveal Data Folder') {
      fail(`the buttons are "${box.buttons.join(' | ')}"`);
    }
    log(`the screen said "${box.message}" with buttons ${box.buttons.join(' | ')}`);
    log(`and it said: ${box.detail.split('\n')[0] ?? ''}`);

    if (revealed[0] !== dbPath) {
      fail(`Reveal pointed at ${String(revealed[0])}, not ${dbPath}`);
    }
    if (exits[0] !== 0) fail(`the screen ended with exit ${String(exits[0])}`);
    log(`Reveal opened ${String(revealed[0])} and Quit exited 0`);

    // --- 3. No window was ever created --------------------------------------
    const windows = BrowserWindow.getAllWindows();
    if (windows.length !== 0) {
      fail(
        `${String(windows.length)} window(s) exist. The whole point is that the ` +
          'person never sees an empty home screen with their sessions missing.'
      );
    }
    log('no window was created');

    // --- 4. And the file is byte identical ----------------------------------
    const after = sha256(dbPath);
    if (after !== before) {
      fail(`the session list changed: ${before} then ${after}`);
    }
    log(`the session list is byte identical (sha256 ${after.slice(0, 16)}…)`);

    // --- 5. The negative control --------------------------------------------
    // A manifest this build wrote and did not stamp forward is not refused.
    const ordinary = join(dirname(dbPath), 'ordinary.db');
    new ManifestStore(ordinary).close();
    if (manifestRefusal(ordinary) !== null) {
      fail('a manifest this build just wrote was refused');
    }
    log('a manifest this build wrote is not refused');

    log('PASS');
    app.exit(0);
  } catch (err) {
    console.error(`[gmux-refusal] FAIL: ${(err as Error).message}`);
    app.exit(1);
  }
}
