/**
 * ps-read.mjs — the Phase 323 INSTRUMENTS' own process table reader, shared by
 * build/p323/probe-p323.mjs and build/p323/harness-arms.mjs.
 *
 * DELIBERATELY NOT src/main/proc/session-tree.ts. The instruments count
 * survivors and end what they started, and an instrument that read the table
 * through the module it measures would agree with that module's mistakes
 * (build/p323/SPEC.md §8.1). So this is a second reader, written for the
 * instruments alone, and the two builders who each wrote one are served by this
 * one (the integration round found the same twenty-line parser in both files).
 *
 * Every read is `/bin/ps` under `LC_ALL=C` with `-ww`, because `lstart` is
 * locale dependent and a truncated command line is not an identity (SPEC
 * §1.2). A read that did not answer is NULL, never an empty map: an empty map
 * means "none of these is running", and a failed read that looked like one
 * would count a survivor as gone.
 */

import { spawnSync } from 'node:child_process';

export const PS_FIELDS = 'pid=,ppid=,pgid=,tpgid=,stat=,lstart=,command=';

const PS_LINE = new RegExp(
  '^\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)\\s+(-?\\d+)\\s+(\\S+)\\s+' +
    '((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+\\d{1,2}\\s+\\d{2}:\\d{2}:\\d{2}\\s+\\d{4})' +
    '(?:\\s+(.*))?$'
);

/** pid → row, from `ps -o PS_FIELDS` text taken under the C locale. */
export function parsePsRows(stdout) {
  const rows = new Map();
  for (const line of stdout.split('\n')) {
    const m = PS_LINE.exec(line);
    if (m === null) continue;
    rows.set(Number(m[1]), {
      pid: Number(m[1]),
      ppid: Number(m[2]),
      pgid: Number(m[3]),
      tpgid: Number(m[4]),
      stat: m[5],
      lstart: m[6].replace(/\s+/g, ' '),
      command: (m[7] ?? '').trimEnd()
    });
  }
  return rows;
}

/**
 * One `/bin/ps`: the whole table when `pids` is null, the named pids otherwise.
 * An empty map when none of the named pids is running. NULL when `ps` did not
 * answer: it could not start, it ran out of time, a signal ended it, or it
 * exited with anything but 0 (and, for a pid read only, 1, which is how `ps -p`
 * says the named pid is gone).
 *
 * Never `ps -p a,b` (the fix round): on macOS that costs about 200 ms of system
 * time where one pid costs 2, and such calls run one at a time, so an
 * instrument re-reading several pids every 100 ms loaded the very machine it
 * was timing. One pid is `-p`; several are the wide table, filtered here.
 */
export function psRows(pids = null) {
  if (pids !== null && pids.length === 0) return new Map();
  if (pids !== null && pids.length > 1) {
    const table = psRows(null);
    if (table === null) return null;
    const wanted = new Set(pids);
    return new Map([...table].filter(([pid]) => wanted.has(pid)));
  }
  const args =
    pids === null
      ? ['-ww', '-axo', PS_FIELDS]
      : ['-ww', '-o', PS_FIELDS, '-p', String(pids[0])];
  const r = spawnSync('/bin/ps', args, {
    env: { ...process.env, LC_ALL: 'C' },
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 10_000
  });
  if (r.error !== undefined || r.signal !== null) return null;
  if (r.status !== 0 && !(pids !== null && r.status === 1)) return null;
  return parsePsRows(r.stdout ?? '');
}
