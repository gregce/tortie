/**
 * `npm run conformance:watcher:cap` — re-measure the FSEvents exclusion cap
 * (Phase 151).
 *
 * This is the SLOW half of the watcher gate and it is deliberately not in the
 * commit battery: it takes about 25 seconds, because each row needs a real
 * FSEvents stream and a real settling window. `npm run conformance:watcher`
 * is the ~1 second gate that runs on every commit and asserts the code stays
 * inside the number this script measures.
 *
 * Run it when the macOS version changes, when @parcel/watcher is upgraded, or
 * whenever somebody proposes moving EXCLUSION_PATH_BUDGET. It compiles
 * build/fsevents-cap.c, whose header carries the recorded table and the
 * reasoning, and prints the same table fresh.
 *
 * It launches no Electron, starts no tmux server, runs no agent and touches
 * nothing under the person's home. Its scratch directory and its compiled
 * binary are removed in a `finally` block whatever happens.
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

if (process.platform !== 'darwin') {
  process.stdout.write(
    'SKIP: FSEventStreamSetExclusionPaths is macOS only. The budget this ' +
      'measures constrains the macOS backend and nothing else.\n'
  );
  process.exit(0);
}

const ROWS = [0, 4, 7, 8, 9, 12, 20];
const TOTAL_DIRS = 24;

// realpath, because FSEvents reports canonical paths: on macOS the
// mkdtemp form is /var/folders/... and every event arrives as
// /private/var/folders/..., so an un-resolved root matches nothing.
const scratch = realpathSync(mkdtempSync(join(tmpdir(), 'gmux-fsevents-cap-')));
const failures = [];

try {
  const bin = join(scratch, 'fsevents-cap');
  const build = spawnSync(
    'clang',
    ['-O1', '-o', bin, 'build/fsevents-cap.c', '-framework', 'CoreServices'],
    { encoding: 'utf8' }
  );
  if (build.status !== 0) {
    process.stdout.write(build.stderr ?? '');
    process.stdout.write(
      '\nFAIL: could not compile build/fsevents-cap.c. clang ships with the ' +
        'Xcode command line tools; install them and run this again.\n'
    );
    process.exit(1);
  }

  const pad = (v, n) => String(v).padEnd(n);
  process.stdout.write(
    `${pad('PATHS PASSED', 14)} ${pad('RETURNED', 10)} ${pad('SUPPRESSED', 12)} DELIVERED\n`
  );

  for (const n of ROWS) {
    const root = join(scratch, `t${n}`);
    for (let i = 0; i < TOTAL_DIRS; i++) {
      mkdirSync(join(root, `d${i}`), { recursive: true });
    }
    const run = spawnSync(bin, [String(n), root], { encoding: 'utf8' });
    if (run.status !== 0) {
      failures.push(`row ${n}: the measurement binary exited ${run.status}`);
      continue;
    }
    const r = JSON.parse(run.stdout.trim().split('\n').at(-1));
    process.stdout.write(
      `${pad(n, 14)} ${pad(r.setExclusionPathsReturned, 10)} ` +
        `${pad(`${r.suppressed}/${r.considered}`, 12)} ${r.delivered}/${r.totalDirs}\n`
    );

    // The control first. A run that saw nothing would otherwise report
    // perfect suppression at every row.
    if (r.delivered !== r.totalDirs - r.suppressed) {
      failures.push(
        `row ${n}: ${r.delivered} of ${r.totalDirs} directories delivered and ` +
          `${r.suppressed} were suppressed, which do not add up. The stream ` +
          'did not see the tree, so this row measures nothing.'
      );
      continue;
    }

    // The two claims the whole design rests on.
    if (n > 0 && n <= 8) {
      if (
        r.setExclusionPathsReturned !== true ||
        r.suppressed !== n ||
        r.delivered !== r.totalDirs - n
      ) {
        failures.push(
          `at ${n} paths the call must succeed, suppress all ${n} and deliver ` +
            `the other ${r.totalDirs - n}. It returned ` +
            `${r.setExclusionPathsReturned}, suppressed ${r.suppressed} and ` +
            `delivered ${r.delivered}.`
        );
      }
    }
    if (n > 8) {
      if (
        r.setExclusionPathsReturned !== false ||
        r.suppressed !== 0 ||
        r.delivered !== r.totalDirs
      ) {
        failures.push(
          `at ${n} paths the call must FAIL, suppress NOTHING and deliver all ` +
            `${r.totalDirs}. It returned ${r.setExclusionPathsReturned}, ` +
            `suppressed ${r.suppressed} and delivered ${r.delivered}. ` +
            'If macOS has changed this, EXCLUSION_PATH_BUDGET may move, and ' +
            'the header of build/fsevents-cap.c must be rewritten with the ' +
            'new table before it does.'
        );
      }
    }
  }

  if (failures.length > 0) {
    process.stdout.write(`\nFAIL, ${failures.length}:\n`);
    for (const f of failures) process.stdout.write(`  - ${f}\n`);
    process.exit(1);
  }

  process.stdout.write(
    '\nPASS. Up to eight exclusion paths apply exactly. At nine and above the ' +
      'call returns false and NOTHING is excluded, which is why\n' +
      'EXCLUSION_PATH_BUDGET is 8 and why the overflow becomes a userspace ' +
      'glob instead of a ninth path.\n'
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
