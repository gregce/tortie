/**
 * p164-spawn-hook.cjs. A spawn recorder for the Electron MAIN process, loaded
 * through NODE_OPTIONS=--require by build/probe-p164-boot.mjs (Phase 164).
 *
 * It changes no production file. It records every child process the main
 * process starts, with the time since the process time origin, which is the
 * same origin Phase 163's performance.mark milestones use, and at
 * GMUX_P164_HOLD_MS it writes one JSON file carrying the spawn log and every
 * `tortie:*` mark read straight out of the performance buffer. Phase 163's
 * milestones are the ruler; this file adds no second one.
 *
 * Only the main process records. Helpers carry process.versions.electron too,
 * and a plain node child, being an agent CLI under a version probe, inherits
 * NODE_OPTIONS and must be left exactly as it was, so the guard is
 * `process.type === 'browser'` and nothing else.
 *
 * It starts no process of its own and names no Electron program, so
 * build/assert-electron-teardown.mjs reads it and finds nothing.
 */
'use strict';
const cp = require('node:child_process');
const fs = require('node:fs');
const { performance } = require('node:perf_hooks');

const out = process.env.GMUX_P164_SPAWN_LOG;
if (out && process.type === 'browser') {
  const rows = [];
  const record = (file, args, cwd, sync) => {
    rows.push({
      t: Math.round(performance.now() * 10) / 10,
      file: String(file),
      args: (args ?? []).slice(0, 6).map(String),
      cwd: cwd ? String(cwd) : null,
      sync
    });
  };
  // Every asynchronous start (spawn, execFile, exec, fork) reaches
  // ChildProcess.prototype.spawn with the resolved file and argv.
  const proto = cp.ChildProcess.prototype;
  const origSpawn = proto.spawn;
  proto.spawn = function (options) {
    try {
      record(options.file, (options.args ?? []).slice(1), options.cwd, false);
    } catch {}
    return origSpawn.call(this, options);
  };
  for (const name of ['spawnSync', 'execFileSync', 'execSync']) {
    const orig = cp[name];
    cp[name] = function (file, args, opts) {
      try {
        const a = Array.isArray(args) ? args : [];
        const o = Array.isArray(args) ? opts : args;
        record(file, a, o && o.cwd, true);
      } catch {}
      return orig.apply(this, arguments);
    };
  }
  const milestones = () =>
    performance
      .getEntriesByType('mark')
      .filter((m) => m.name.startsWith('tortie:'))
      .map((m) => ({ name: m.name.slice(7), atMs: Math.round(m.startTime * 10) / 10 }));
  const write = (why) => {
    try {
      fs.writeFileSync(
        `${out}.${String(process.pid)}.json`,
        JSON.stringify(
          {
            why,
            pid: process.pid,
            type: process.type,
            writtenAt: performance.now(),
            milestones: milestones(),
            spawns: rows
          },
          null,
          1
        )
      );
    } catch {}
  };
  let held = false;
  const hold = Number(process.env.GMUX_P164_HOLD_MS || '8000');
  setTimeout(() => {
    held = true;
    write('hold');
  }, hold).unref();
  process.on('exit', () => {
    if (!held) write('exit');
  });
}
