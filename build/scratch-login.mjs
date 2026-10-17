/**
 * scratch-login.mjs. The login shell a probe's Electron asks, made the scratch
 * HOME's, and the two readings that prove no real agent ran (Phase 346's ruled
 * round, build/p346/SPEC.md §As built).
 *
 * ## Why this file exists
 *
 * Tortie launches an agent by its bare name. tmux finds the program on the
 * PATH Tortie captured from the person's LOGIN shell, and a probe puts its
 * stand-ins first on that PATH by writing them into the scratch HOME's
 * `.zprofile`. zsh reads `$ZDOTDIR/.zprofile`, not `$HOME/.zprofile`, so a probe
 * that gives its Electron a scratch HOME and leaves `ZDOTDIR` as whoever ran it
 * set it captures a PATH its stand-ins are not on. On 2026-10-16 that is what
 * happened: a verifier ran probe:p313 with the scratch `ZDOTDIR` its brief
 * required, the login PATH held `/Users/gdc/.local/bin` and no stand-in, and
 * both `claude` sessions started his REAL Claude Code, six times over three
 * runs, while the probe read B1 and S1 UNREADABLE and said nothing else.
 *
 * ## The four exports a probe uses, and `within`
 *
 *   scratchShellEnv(home)   `ZDOTDIR` the scratch HOME, `HISTFILE` /dev/null,
 *                           and no `TERM_SESSION_ID`, for the Electron's env
 *                           (the value `undefined` is what removes a key).
 *   plantedResolve({ home, bin, names, env })
 *                           asks the login shell the app will ask
 *                           (`$SHELL -lic 'command -v <name>'`, with the env
 *                           the app will be given) where each planted name
 *                           resolves; `ok` only when every one is
 *                           `<bin>/<name>`. A probe REFUSES (exit 2) when it
 *                           is not, before anything is launched.
 *   manifestSessions(path)  every session row of a manifest after the app is
 *                           gone: the file copied WITH its `-wal` and `-shm`
 *                           into a scratch folder of the system's temporary
 *                           directory and read there, because the app's own
 *                           file is WAL-mode with no `-shm` left after a quit
 *                           and `sqlite3 -readonly` cannot open it ("unable to
 *                           open database file (14)"). `{ read, rows, why }`,
 *                           each row `{ id, name, agent, argv0 }`. A manifest
 *                           not read is UNREADABLE to the probe, never a pass
 *                           and never a failure.
 *   launchableAgentIds(checkout)
 *                           the checkout's compiled launchable agent ids, read
 *                           through the pinned tsx, for a probe that renames
 *                           every row it does not plant.
 *
 * It starts nothing but synchronous children it waits for (a login shell per
 * name, `/usr/bin/sqlite3`, the pinned tsx), reads nothing under the person's
 * home, and is in no battery.
 */

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { tsxCli } from './ts-runner.mjs';

const J = (v) => JSON.stringify(v);

/** The Electron's three shell variables: the scratch HOME's zsh files, no history, no Terminal session. */
export function scratchShellEnv(home) {
  return { ZDOTDIR: home, HISTFILE: '/dev/null', TERM_SESSION_ID: undefined };
}

/**
 * Where the login shell the app will ask resolves each planted name, asked with
 * the environment the app will be given (`env`, over this process's, then the
 * scratch HOME and its three shell variables; a key whose value is `undefined`
 * is removed). `{ ok, resolved, said }`.
 */
export function plantedResolve({ home, bin, names, env = {} }) {
  const shellEnv = { ...process.env, ...env, HOME: home, ...scratchShellEnv(home) };
  for (const [k, v] of Object.entries(shellEnv)) if (v === undefined) delete shellEnv[k];
  const shell = (process.env['SHELL'] ?? '').trim() || '/bin/zsh';
  const resolved = {};
  for (const name of names) {
    if (!/^[A-Za-z0-9._-]+$/.test(name)) return { ok: false, resolved, said: `${J(name)} is not a plain program name` };
    const r = spawnSync(shell, ['-lic', `command -v ${name} || true`], { encoding: 'utf8', timeout: 30_000, env: shellEnv });
    resolved[name] = String(r.stdout ?? '').trim().split('\n').pop() ?? '';
  }
  const wrong = Object.entries(resolved).filter(([name, at]) => at !== join(bin, name));
  return {
    ok: names.length > 0 && wrong.length === 0,
    resolved,
    said:
      wrong.length === 0
        ? `the scratch login shell resolves ${names.map((n) => `${n} to ${join(bin, n)}`).join(', ')}`
        : `the scratch login shell resolves ${wrong.map(([n, at]) => `${n} to ${at === '' ? 'nothing' : at}`).join(', ')}, not the stand-in`
  };
}

/** Every session row of a manifest, read from a copy beside its WAL. Never opens the app's own file. */
export function manifestSessions(path) {
  if (typeof path !== 'string' || !existsSync(path)) return { read: false, rows: [], why: 'there is no manifest' };
  const dir = mkdtempSync(join(tmpdir(), 'scratch-manifest-'));
  try {
    const copy = join(dir, basename(path));
    copyFileSync(path, copy);
    for (const side of ['-wal', '-shm']) if (existsSync(`${path}${side}`)) copyFileSync(`${path}${side}`, `${copy}${side}`);
    const r = spawnSync('/usr/bin/sqlite3', ['-json', copy, 'select id, name, agent, argv from sessions;'], { encoding: 'utf8', timeout: 20_000, maxBuffer: 16 * 1024 * 1024 });
    if (r.status !== 0) return { read: false, rows: [], why: `sqlite3 answered ${String(r.status)}: ${String(r.stderr ?? '').trim().slice(0, 160)}` };
    let raw = [];
    try {
      raw = JSON.parse(String(r.stdout ?? '').trim() || '[]');
    } catch {
      return { read: false, rows: [], why: 'sqlite3 printed no JSON' };
    }
    const rows = raw.map((row) => {
      let argv0 = null;
      try {
        argv0 = JSON.parse(row.argv)?.[0] ?? null;
      } catch {
        argv0 = null;
      }
      return { id: row.id, name: row.name, agent: row.agent, argv0 };
    });
    return { read: true, rows, why: null };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Whether `path` is `root` or inside it. */
export const within = (root, path) => typeof path === 'string' && typeof root === 'string' && root !== '' && (path === root || path.startsWith(`${root}/`));

/** The checkout's compiled launchable agent ids, in registry order, or null. */
export function launchableAgentIds(checkout) {
  const script = ["import { LAUNCHABLE_AGENT_IDS } from './src/main/agents/registry.ts';", 'process.stdout.write(JSON.stringify([...LAUNCHABLE_AGENT_IDS]));', ''].join('\n');
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', '-'], { cwd: checkout, input: script, encoding: 'utf8', timeout: 120_000 });
  try {
    const ids = JSON.parse(r.stdout);
    return Array.isArray(ids) && ids.every((id) => typeof id === 'string') ? ids : null;
  } catch {
    return null;
  }
}
