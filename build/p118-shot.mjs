#!/usr/bin/env node
/**
 * p118-shot.mjs. The photograph of the sentence a person reads when a copy onto
 * another machine was cut off by a quit (Phase 118).
 *
 * ## What it proves
 *
 * One claim, and it is the phase's only visual evidence item: a launch whose
 * manifest carries one unfinished `remote_executions` row draws the
 * `remote-work-cut-off` toast, with the machine's label in it and an action
 * that opens the logs.
 *
 * ## What it does NOT do
 *
 * It starts no ssh. It contacts no machine. It creates no session. It never
 * runs a copy. The row it photographs is written straight into the profile's
 * own manifest with the `sqlite3` program, because the point is what the BOOT
 * READ does with a row that is already there.
 *
 * ## How it works, in two launches
 *
 *  1. One launch on a fresh profile, only to let Tortie create its manifest at
 *     the current schema. Its picture is thrown away.
 *  2. One row is written into `remote_executions` with no outcome.
 *  3. A second launch on the SAME profile. Its boot read finds that row, closes
 *     it, and posts the notice. `GMUX_SHOT` photographs the window.
 *
 * ## Safety
 *
 * The app gets its own user data directory under this run's own root, outside
 * the repository. It never opens the operator's profile, their manifest or
 * `/Applications/Tortie.app`. It signals only the pids it spawned. There is no
 * `pkill` and no `kill-server` in this file. `-L gmux` appears once, in a read
 * only session count taken before and after.
 *
 * Usage, from the repository root:
 *
 *   npm run shot:p118            (add -- --keep to keep the scratch root)
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runElectron } from './electron-run.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TAG = '[p118-shot]';
const say = (line) => console.log(`${TAG} ${line}`);

function refuse(why) {
  console.error(`${TAG} ${why}`);
  process.exit(2);
}

const keep = process.argv.includes('--keep');

if (!existsSync(join(REPO, 'out', 'main', 'index.js'))) {
  refuse('out/main/index.js is missing. Run npm run build first.');
}

/** The operator's live server, listed and never written. The ONLY mention. */
function operatorSessionCount() {
  const out = spawnSync('tmux', ['-L', 'gmux', 'list-sessions'], {
    encoding: 'utf8'
  });
  return (out.stdout ?? '').split('\n').filter((line) => line.trim() !== '')
    .length;
}

const operatorBefore = operatorSessionCount();
say(`operator sessions on -L gmux before: ${String(operatorBefore)}`);

const root = join(tmpdir(), `p118-shot-${String(process.pid)}`);
rmSync(root, { recursive: true, force: true });
const profile = join(root, 'profile');
mkdirSync(profile, { recursive: true, mode: 0o700 });

const shotPath = join(root, 'p118-cut-off.png');
/**
 * One launch that photographs the window and quits.
 *
 * It goes through build/electron-run.mjs (Phase 140), which ends the tree it
 * started in a finally block whatever happened. That is why this is now
 * asynchronous: the blocking spawnSync it used to call could not be given a
 * teardown that runs on a throw. The shape of the answer is unchanged, being
 * an object with `status`, `stdout` and `stderr`, so the readings below did
 * not move. Both streams arrive on `stdout` now, because the helper collects
 * them in arrival order and the two callers print both.
 */
async function launch(out) {
  const r = await runElectron({
    label: 'p118-shot',
    userDataDir: profile,
    cwd: REPO,
    env: {
      ...process.env,
      GMUX_SHOT: out,
      GMUX_SHOT_DELAY_MS: '6000',
      GMUX_SKIP_USERDATA_MIGRATION: '1',
      GMUX_SPECSTORY_NO_CLOUD: '1'
    },
    ceilingMs: 180_000
  });
  return { status: r.code, stdout: r.text, stderr: '' };
}

// --- 1. The first launch, only to create the manifest ------------------------
const first = await launch(join(root, 'p118-warmup.png'));
if (first.status !== 0) {
  say(first.stdout ?? '');
  say(first.stderr ?? '');
  refuse(`the warm up launch exited ${String(first.status)}`);
}
const manifest = join(profile, 'gmux', 'manifest.db');
if (!existsSync(manifest)) {
  refuse(`no manifest at ${manifest} after the warm up launch`);
}
say(`the profile's manifest is at ${manifest}`);

// --- 2. One unfinished copy, written straight into that manifest -------------
//
// `sqlite3` rather than better-sqlite3, because that module in this repository
// is built for Electron's own ABI and this file is plain node.
const insert = spawnSync(
  '/usr/bin/sqlite3',
  [
    manifest,
    `INSERT INTO remote_executions
       (machine_id, machine_label, kind, subject, started_at, outcome, finished_at)
     VALUES ('shot-machine', 'Studio upstairs', 'clone',
             '/Users/someone/work/the-project', ${String(Date.now() - 90_000)},
             NULL, NULL);`
  ],
  { encoding: 'utf8' }
);
if (insert.status !== 0) {
  say(insert.stderr ?? '');
  refuse('the row could not be written into the manifest');
}
say('one unfinished copy is in the manifest, with no outcome');

// --- 3. The launch that draws the sentence -----------------------------------
const second = await launch(shotPath);
if (second.status !== 0) {
  say(second.stdout ?? '');
  say(second.stderr ?? '');
  refuse(`the photographing launch exited ${String(second.status)}`);
}
if (!existsSync(shotPath)) refuse(`no image was written to ${shotPath}`);

const operatorAfter = operatorSessionCount();
if (operatorAfter !== operatorBefore) {
  refuse(
    `the operator's own server held ${String(operatorBefore)} session(s) and ` +
      `now holds ${String(operatorAfter)}`
  );
}

say(`the picture is at ${shotPath}`);
say(`operator sessions on -L gmux after: ${String(operatorAfter)}`);
if (keep) {
  say(`the scratch root is kept at ${root}`);
} else {
  say(`the picture stays at ${shotPath} and the rest of ${root} is kept with it`);
}
