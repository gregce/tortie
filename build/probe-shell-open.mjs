#!/usr/bin/env node
/**
 * probe-shell-open.mjs — the Phase 51 live probe, reproducible from the repo.
 *
 * WHAT IT PROVES. The three delivery legs of `tortie .`, against the dev
 * Electron binary driven directly (never through `open`, because
 * LaunchServices may resolve a shared dev bundle id to a different copy):
 *
 *  1. COLD: the FIRST launch carries a folder on its argv, and after boot
 *     the isolated profile's manifest holds a project row with that path.
 *  2. WARM: a SECOND launch against the same profile carries a different
 *     folder. The second copy exits 0 (refused by the single-instance
 *     lock), its lifetime is measured and printed, and the folder appears
 *     in the holder's manifest and in recents.json.
 *  3. SHOT: a fresh profile boots with a third folder on argv under
 *     GMUX_SHOT, so the capture shows the project tab the pending-open
 *     pull created. This is the Tier 2 screenshot.
 *
 * SAFETY. The tmux socket is gmux-p51 and build/harness-socket.mjs refuses
 * the operator's socket by name; this script only ever runs Electron under
 * that wrapper (the script re-invokes itself as the wrapper's inner
 * command). Profiles live under TMPDIR and are deleted first. The
 * operator's server is only ever LISTED, read-only, and the count is
 * printed before and after. The only processes killed are the pids this
 * script recorded.
 *
 * Usage:
 *   node build/probe-shell-open.mjs [--keep] [--skip-build]
 */

import { execFileSync, spawnSync } from 'node:child_process';
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron, withElectron } from './electron-run.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.includes('--keep');
const skipBuild = process.argv.includes('--skip-build');
const innerAt = process.argv.indexOf('--inner');

const SOCKET = 'gmux-p51';

/** Operator sessions on the REAL socket, read-only. Never anything else. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  if (out.status !== 0) return 0;
  return out.stdout.split('\n').filter((l) => l.trim().length > 0).length;
}

// ---------------------------------------------------------------------------
// Outer mode: prepare, wrap the inner run in harness-socket, report
// ---------------------------------------------------------------------------

if (innerAt === -1) {
  const rawRoot = join(process.env['TMPDIR'] ?? tmpdir(), 'gmux-p51');
  rmSync(rawRoot, { recursive: true, force: true });
  for (const dir of ['cold', 'warm', 'shot-folder', 'profile', 'shot-profile']) {
    mkdirSync(join(rawRoot, dir), { recursive: true });
  }
  mkdirSync(join(repoRoot, 'out'), { recursive: true });
  const root = realpathSync(rawRoot);

  const before = operatorSessionCount();
  console.log(`[probe:shellopen] operator sessions before: ${before}`);

  if (!skipBuild) {
    execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit' });
  }

  const run = spawnSync(
    process.execPath,
    [
      join(repoRoot, 'build', 'harness-socket.mjs'),
      SOCKET,
      `node build/probe-shell-open.mjs --inner "${root}"`
    ],
    {
      cwd: repoRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        PATH: `${join(repoRoot, 'node_modules', '.bin')}:${process.env['PATH'] ?? ''}`
      }
    }
  );

  const after = operatorSessionCount();
  console.log(
    `[probe:shellopen] operator sessions after: ${after} (before: ${before})`
  );
  // A failing run keeps its evidence (the holder log lives under root).
  if (!keep && (run.status ?? 1) === 0) {
    rmSync(root, { recursive: true, force: true });
  }
  process.exit(run.status ?? 1);
}

// ---------------------------------------------------------------------------
// Inner mode: runs under harness-socket, GMUX_TMUX_SOCKET already set
// ---------------------------------------------------------------------------

const root = process.argv[innerAt + 1];
if (!root || !existsSync(root)) {
  console.error(`[probe:shellopen] inner: bad root ${root}`);
  process.exit(2);
}
if ((process.env['GMUX_TMUX_SOCKET'] ?? '') !== SOCKET) {
  console.error(
    '[probe:shellopen] inner: GMUX_TMUX_SOCKET is not set; run the outer mode'
  );
  process.exit(2);
}

const require2 = createRequire(join(repoRoot, 'package.json'));
const Database = require2('better-sqlite3');

const profile = join(root, 'profile');
const coldDir = join(root, 'cold');
const warmDir = join(root, 'warm');
const shotDir = join(root, 'shot-folder');
const shotProfile = join(root, 'shot-profile');
const shotPath = join(repoRoot, 'out', 'p51-shell-open.png');
const holderLogPath = join(root, 'holder.log');

rmSync(shotPath, { force: true });

const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** All project paths in a profile's manifest, [] until it exists. */
function manifestProjectPaths(profileDir) {
  const dbPath = join(profileDir, 'gmux', 'manifest.db');
  if (!existsSync(dbPath)) return [];
  let db = null;
  try {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
    return db
      .prepare('SELECT path FROM projects')
      .all()
      .map((row) => String(row.path));
  } catch {
    return [];
  } finally {
    db?.close();
  }
}

/** Accept the argv spelling or its realpath — main may canonicalize. */
function pathsMatch(candidates, wanted) {
  const wanteds = new Set([wanted]);
  try {
    wanteds.add(realpathSync(wanted));
  } catch {
    /* the folder was deleted mid-probe; the raw spelling still counts */
  }
  return candidates.some((c) => wanteds.has(c));
}

async function waitForProjectRow(profileDir, wanted, label, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (pathsMatch(manifestProjectPaths(profileDir), wanted)) {
      console.log(`[probe:shellopen] ${label}: manifest row present`);
      return true;
    }
    await sleep(500);
  }
  failures.push(
    `${label}: no manifest row for ${wanted} within ${timeoutMs} ms`
  );
  return false;
}

const rehearsalEnv = {
  ...process.env,
  GMUX_UPDATE_REHEARSAL: '1'
};

// build/electron-run.mjs owns all three launches (Phase 140) and ends each
// tree in a finally block whatever happened. The hand written teardown that
// used to sit at the bottom of this file is gone with it.
await withElectron(
  {
    label: 'shell-open holder',
    userDataDir: profile,
    cwd: repoRoot,
    args: [coldDir],
    env: rehearsalEnv
  },
  async (handle) => {
    const holder = handle.child;
    const holderLog = createWriteStream(holderLogPath, { flags: 'w' });
    holder.stdout.pipe(holderLog);
    holder.stderr.pipe(holderLog);
    console.log(`[probe:shellopen] holder pid ${holder.pid} (recorded)`);

    let holderExited = false;
    holder.on('exit', () => {
      holderExited = true;
    });

    // Cold leg: the first launch's own argv folder becomes a project row.
    await waitForProjectRow(profile, coldDir, 'cold leg', 90_000);

    if (holderExited) {
      failures.push('the holder exited before the warm leg ran');
    }

    // Warm leg: a second copy against the same profile, a different folder.
    const warmStart = Date.now();
    const warm = await runElectron({
      label: 'shell-open warm',
      userDataDir: profile,
      cwd: repoRoot,
      args: [warmDir],
      persistence: false,
      env: rehearsalEnv,
      ceilingMs: 60_000
    });
    const warmMs = Date.now() - warmStart;
    console.log(
      `[probe:shellopen] warm leg: second copy exited ${warm.code} after ${warmMs} ms`
    );
    if (warm.code !== 0) {
      failures.push(
        `warm leg: the second copy exited ${warm.code}, expected 0. output: ${warm.text.slice(0, 400)}`
      );
    }
    await waitForProjectRow(profile, warmDir, 'warm leg', 60_000);

    // Recents: projects:add records every route, so the warm folder is there.
    const recentsPath = join(profile, 'recents.json');
    const recentsText = existsSync(recentsPath)
      ? readFileSync(recentsPath, 'utf8')
      : '';
    const warmReal = (() => {
      try {
        return realpathSync(warmDir);
      } catch {
        return warmDir;
      }
    })();
    if (!recentsText.includes(warmDir) && !recentsText.includes(warmReal)) {
      failures.push(`warm leg: recents.json has no entry for ${warmDir}`);
    } else {
      console.log('[probe:shellopen] warm leg: recents.json entry present');
    }

    // Shot leg: a fresh profile, a third folder on argv, one PNG. The capture
    // shows the tab the pending-open pull created on a cold boot.
    const shot = await runElectron({
      label: 'shell-open shot',
      userDataDir: shotProfile,
      cwd: repoRoot,
      args: [shotDir],
      env: {
        ...process.env,
        GMUX_SHOT: shotPath,
        GMUX_SHOT_DELAY_MS: '6000'
      },
      ceilingMs: 120_000
    });
    if (shot.code !== 0) {
      failures.push(`shot leg: exited ${shot.code}`);
    }
    if (existsSync(shotPath)) {
      console.log(`[probe:shellopen] screenshot ${shotPath}`);
    } else {
      failures.push(`shot leg: no screenshot was written to ${shotPath}`);
    }
    if (!pathsMatch(manifestProjectPaths(shotProfile), shotDir)) {
      failures.push(
        'shot leg: the shot profile manifest has no row for the argv folder'
      );
    } else {
      console.log('[probe:shellopen] shot leg: manifest row present');
    }
  }
);

if (failures.length > 0) {
  console.error('');
  for (const failure of failures) {
    console.error(`[probe:shellopen] FAIL ${failure}`);
  }
  console.error(`[probe:shellopen] holder log: ${holderLogPath}`);
  process.exit(1);
}
console.log('[probe:shellopen] PASS: cold, warm and shot legs all delivered');
