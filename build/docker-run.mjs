#!/usr/bin/env node
/**
 * docker-run.mjs. One place that makes a throwaway Linux machine in the
 * operator's Docker, and one place that removes it (Phase 342, build/p342/SPEC.md
 * D27, §6.2).
 *
 * ## Why this file exists
 *
 * Phase 342 measures Tortie on the tmux each Linux distribution ships, and the
 * operator's ruling of 2026-10-05 is the whole licence for it: "you can do the
 * docker tests but make sure to clean them up". His Docker holds his own work
 * (his `supabase_*` containers, 31 GB of images, volumes he cares about), so a
 * leaked container, a prune, an image removed under one of his tags or a
 * re-tag of one of his images is damage to his machine, not a messy scratch
 * directory. A container is also not a child process: `docker run -d` returns
 * at once and the container runs under the daemon, so nothing that ends a
 * child ends it, and `gate:background` never sees it. That is the Simulator's
 * shape (build/simulator-run.mjs), and it gets the Simulator's answer: the
 * container's whole life is one function, and build/assert-docker-teardown.mjs
 * (`gate:docker`) is the gate that keeps it here. No other file under build/
 * names `docker` on a spawn.
 *
 * ## The exports
 *
 *   withContainers(options, body)  Make one container per row, from the
 *                                  distribution's own image on Docker Hub,
 *                                  install inside it what the row needs, hand
 *                                  the handles to `body`, and remove every
 *                                  container and every image this call pulled
 *                                  in a `finally`, whatever `body` did; then
 *                                  compare Docker's lists with the ones read
 *                                  before the first command and FAIL the run on
 *                                  any difference.
 *   ROWS                           The seven rows of SPEC §7.5 item 1.
 *   runArgv(spec)                  The one `docker run` argv, for the gate.
 *   dockerPreflight(options)       The sentence naming why a run cannot start
 *                                  (Docker not answering, under 10 GB free),
 *                                  or null. Synchronous; it starts nothing.
 *   sweepLedger(path)              `node build/docker-run.mjs --sweep <ledger>`:
 *                                  remove a leaked run's containers and pulled
 *                                  images by EXACT name, and compare the lists.
 *
 * ## The rules, each one a clause of gate:docker
 *
 *  1. Every name this file composes begins {@link NAME_PREFIX}, `tortie-p342-`,
 *     through that one constant, and is written to the run's LEDGER before the
 *     command that creates it runs. A later phase that reuses this file passes
 *     its own `tortie-<phase>-` prefix and nothing else.
 *  2. A base image is pulled EXPLICITLY, by its exact reference, and only when
 *     it is not on this Mac already; every `docker run` carries `--pull never`,
 *     so no pull is ever implicit and so none escapes the ledger.
 *  3. `--platform` is passed only for a reference the before list does not
 *     hold. Pulling another platform under one of his tags RE-TAGS HIS IMAGE
 *     (SPEC §13 item 2), so a reference he has is used as it is.
 *  4. Every `docker run` carries `--rm`, `--pull never`, a FIXED
 *     `-p 127.0.0.1:<port>:22` on a port this file chose free (an ephemeral
 *     `127.0.0.1::22` moved on every `docker restart`, SPEC §Attack M-A7), a
 *     main process of `sleep 7200` (so a container whose harness was SIGKILLed
 *     ends itself within two hours and `--rm` removes it), NO mount, NO volume
 *     and NO network of its own.
 *  5. An image is removed with `docker image rm` and NEVER `-f`, only when this
 *     run pulled it, only when it is absent from the before list, and only when
 *     its id is still the id recorded at its pull. Docker itself then refuses
 *     an image a container still uses.
 *  6. The run holds an exclusive lock file ({@link LOCK_PATH}) for its whole
 *     life, so two runs can never remove each other's pulls.
 *  7. The teardown is inside a `finally`, and the net (`exit`, SIGINT, SIGTERM,
 *     SIGHUP, an uncaught throw) is installed BEFORE the first pull or create,
 *     so a signal during either is covered.
 *  8. Nothing here prunes, builds, commits, pushes, logs in, mounts, names the
 *     Docker socket, runs privileged, or selects anything by pattern: every
 *     command names one container or one image by its exact name.
 *  9. Packages are installed INSIDE a container, never on this Mac.
 *
 * ## The Docker CLI's own state
 *
 * Every docker command runs with `DOCKER_CONFIG` pointed at an empty folder of
 * the run's own, so no credential helper, no login and no CLI plugin of his is
 * consulted, and with `DOCKER_HOST` pinned to the endpoint the preflight read,
 * so a probe that pointed `HOME` at scratch still reaches the same daemon.
 * Docker Hub is reached anonymously.
 *
 * ## What this file does not promise
 *
 * A SIGKILL of the harness cannot be handled. The container's main process is
 * `sleep 7200`, so it ends itself within two hours and `--rm` removes it, and
 * `node build/docker-run.mjs --sweep <ledger>` removes it at once by its exact
 * name. An image pulled by a SIGKILLed run is named in its ledger with the id
 * recorded at its pull; `--sweep` removes it when the id still matches.
 *
 * A container is not a machine (SPEC §13 item 1): no systemd, no
 * `/etc/default/locale` on most rows, overlayfs, a root-made account. The
 * Arch row is the one emulated row (`linux/amd64`, SPEC D28) and signs in
 * through dropbear, because OpenSSH's preauth sandbox cannot be installed
 * under emulation.
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  realpathSync,
  readFileSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
  writeSync
} from 'node:fs';
import { createServer } from 'node:net';
import { homedir, tmpdir, userInfo } from 'node:os';
import { delimiter, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[docker-run]';

/** The repository root, being the parent of build/. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every name this file composes begins with this (rule 1). A later phase that
 * reuses the file passes its own `tortie-<phase>-` prefix as
 * `options.namePrefix`, refused unless it has that shape.
 */
export const NAME_PREFIX = 'tortie-p342-';
const PREFIX_RE = /^tortie-p[0-9]{3}(?:[0-9])?-$/;

/** Under this many kilobytes free on `/`, nothing is pulled or made (D27). */
export const DOCKER_MIN_FREE_KB = 10 * 1024 * 1024;

/** The container's main process: it ends itself after two hours (rule 4). */
export const MAIN_PROCESS_SECONDS = 7200;

/** One run at a time (rule 6). A fixed path, so every worktree shares it. */
export const LOCK_PATH = '/private/tmp/tortie-docker-run.lock';

/**
 * The seven rows (SPEC §7.5 item 1). `platform` is passed only when the
 * reference is absent from the before list (rule 3); `debian:bookworm-slim`
 * and `ubuntu:22.04`/`ubuntu:24.04` are in his list and are used as they are.
 */
export const ROWS = Object.freeze({
  u2204: Object.freeze({ ref: 'ubuntu:22.04', family: 'apt', sshd: 'openssh' }),
  u2404: Object.freeze({ ref: 'ubuntu:24.04', family: 'apt', sshd: 'openssh' }),
  u2604: Object.freeze({ ref: 'ubuntu:26.04', family: 'apt', sshd: 'openssh' }),
  d12: Object.freeze({ ref: 'debian:bookworm-slim', family: 'apt', sshd: 'openssh', backports: 'bookworm-backports', codename: 'bookworm' }),
  d13: Object.freeze({ ref: 'debian:13', family: 'apt', sshd: 'openssh', backports: 'trixie-backports', codename: 'trixie' }),
  fed: Object.freeze({ ref: 'fedora:latest', family: 'dnf', sshd: 'openssh' }),
  arch: Object.freeze({ ref: 'archlinux:latest', family: 'pacman', sshd: 'dropbear', platform: 'linux/amd64' })
});

const ROW_ID_RE = /^[a-z][a-z0-9]{1,15}$/;
const RUN_ID_RE = /^[a-z0-9][a-z0-9-]{0,31}$/;
/** An image reference this file may pull: a library name, a tag, nothing else. */
const REF_RE = /^[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)?:[A-Za-z0-9][A-Za-z0-9._-]*$/;
const PLATFORM_RE = /^linux\/(?:amd64|arm64)$/;
const IMAGE_ID_RE = /^sha256:[0-9a-f]{64}$/;

/** Every run this process still holds. The net reads it. */
const live = new Map();
/** Every docker CLI child this file started that has not ended yet. */
const liveChildren = new Set();
let netInstalled = false;
let nextId = 1;

const say = (line) => process.stderr.write(`${TAG} ${line}\n`);

// ---------------------------------------------------------------------------
// The program, and the CLI's own state
// ---------------------------------------------------------------------------

/** The docker CLI, found on PATH by node rather than by a shell. */
function findDockerCli() {
  for (const dir of String(process.env.PATH ?? '').split(delimiter)) {
    if (dir === '') continue;
    const file = join(dir, 'docker');
    try {
      if (statSync(file).isFile()) return file;
    } catch {
      /* not here */
    }
  }
  for (const file of ['/usr/local/bin/docker', '/opt/homebrew/bin/docker', '/Applications/Docker.app/Contents/Resources/bin/docker']) {
    if (existsSync(file)) return file;
  }
  return null;
}

/** The environment every docker command runs in (set by the preflight). */
let cliEnv = null;
let cliPath = null;

function dockerEnvFor(configDir, host) {
  // Narrowed (the proof builder's hardening): the docker program's own folder
  // and the system's, never the person's PATH, so the ssh stand-in that
  // carries this environment finds nothing of his.
  const own = cliPath === null ? [] : [dirname(cliPath)];
  const env = {
    PATH: [...new Set([...own, '/usr/bin', '/bin', '/usr/sbin', '/sbin'])].join(delimiter),
    HOME: configDir,
    DOCKER_CONFIG: configDir,
    LANG: 'C.UTF-8'
  };
  if (host !== null) env.DOCKER_HOST = host;
  return env;
}

// ---------------------------------------------------------------------------
// Refusals, asked before anything is pulled or made
// ---------------------------------------------------------------------------

/** A refusal before anything was made: its caller prints it and exits 2. */
export class DockerRefused extends Error {
  constructor(message) {
    super(message);
    this.name = 'DockerRefused';
    this.exitCode = 2;
  }
}

/** The run's lists differed after the teardown: the caller fails the run. */
export class DockerTeardownMismatch extends Error {
  constructor(message, report) {
    super(message);
    this.name = 'DockerTeardownMismatch';
    this.exitCode = 1;
    this.report = report;
  }
}

/**
 * The places a scratch directory is measured against: the repository, every
 * spelling of the person's home, and the shared temporary roots. Read once per
 * question, never cached.
 *
 * THE HOME IS READ TWICE ON PURPOSE (the proof builder's hardening): `HOME`,
 * which a probe points at its own scratch before it calls here, and the
 * account record's home, which no environment variable moves. A scratch
 * directory under either is refused.
 */
export function scratchWorld() {
  const spellings = (p) => {
    const out = new Set([resolve(p)]);
    try {
      out.add(realpathSync(p));
    } catch {
      /* a path that is not there has one spelling */
    }
    for (const one of [...out]) {
      if (one.startsWith('/private/')) out.add(one.slice('/private'.length));
      else if (/^\/(?:tmp|var)(?:\/|$)/.test(one)) out.add(`/private${one}`);
    }
    return [...out];
  };
  let accountHome = null;
  try {
    accountHome = userInfo().homedir;
  } catch {
    accountHome = null;
  }
  return {
    repo: repoRoot,
    homes: [...new Set([homedir(), accountHome].filter((h) => typeof h === 'string' && h !== '').flatMap(spellings))],
    temps: [...new Set(['/', '/tmp', '/var/tmp', tmpdir()].flatMap(spellings))]
  };
}

/**
 * Why this scratch directory may not be used, or null: not inside the
 * repository, where it would be committed; not under the person's home, by
 * either reading of it; and not a shared temporary ROOT itself, whose other
 * contents are not this run's (a directory INSIDE one, such as
 * `/private/tmp/p342-measure-…`, is what scratch is). Pure over `world`, so
 * `gate:docker` drives it over a made-up repository, home and temp folder.
 */
export function refuseScratchReason(dir, world = scratchWorld()) {
  if (typeof dir !== 'string' || dir === '') return 'no scratch directory was given.';
  if (!dir.startsWith('/')) return `the scratch directory "${dir}" is not an absolute path.`;
  const path = resolve(dir);
  const under = (root) => path === root || path.startsWith(root.endsWith(sep) ? root : root + sep);
  if (under(world.repo)) return `the scratch directory "${path}" is inside the repository.`;
  for (const home of world.homes) {
    if (under(home)) return `the scratch directory "${path}" is under the person's home directory.`;
  }
  for (const root of world.temps) {
    if (path === root || path === root.replace(/\/+$/, '')) return `the scratch directory "${path}" is a shared temporary folder itself, not a folder of this run's.`;
  }
  if (path.length < 8) return `the scratch directory "${path}" is too short to be scratch.`;
  return null;
}

/** Kilobytes free on `/`, read with `df -k /`, or null. */
export function freeKilobytes() {
  const r = spawnSync('/bin/df', ['-k', '/'], { encoding: 'utf8', timeout: 10_000 });
  const line = String(r.stdout ?? '').trim().split('\n')[1] ?? '';
  const n = Number(line.trim().split(/\s+/)[3]);
  return Number.isFinite(n) ? n : null;
}

/**
 * The sentence naming why a Docker run cannot start, or null. SYNCHRONOUS on
 * purpose: asked once, before anything is pulled or made.
 *
 * @param {{minFreeKb?: number}} [options]
 */
export function dockerPreflight(options = {}) {
  const min = Math.max(options.minFreeKb ?? DOCKER_MIN_FREE_KB, DOCKER_MIN_FREE_KB);
  const free = freeKilobytes();
  if (free === null) return 'this Mac would not say how much disk is free (df -k /). Nothing was pulled or made.';
  if (free < min) {
    return `BLOCKED ON DISK: ${String(Math.floor(free / 1024 / 1024))} GB free on /, and a Docker run needs at least ${String(Math.floor(min / 1024 / 1024))} GB. Nothing was pulled or made.`;
  }
  const cli = findDockerCli();
  if (cli === null) return 'no docker program is on this Mac\'s PATH. Nothing was pulled or made.';
  return null;
}

// ---------------------------------------------------------------------------
// Running the CLI, asynchronously, with its child ended on the way out
// ---------------------------------------------------------------------------

function alive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}

/**
 * One docker command, asynchronously. It never rejects: a command that could
 * not start answers code 127 and the reason. `input` is written to its
 * standard input and closed.
 *
 * @param {string[]} args
 * @param {{input?: string|Buffer, timeoutMs?: number}} [options]
 */
function docker(args, options = {}) {
  const { input = null, timeoutMs = 120_000 } = options;
  return new Promise((done) => {
    const out = [];
    const err = [];
    let settled = false;
    let timedOut = false;
    const child = spawn(cliPath, args, { env: cliEnv, stdio: ['pipe', 'pipe', 'pipe'] });
    liveChildren.add(child);
    child.stdout.on('data', (c) => out.push(c));
    child.stderr.on('data', (c) => err.push(c));
    child.stdin.on('error', () => undefined);
    if (input !== null) child.stdin.end(input);
    else child.stdin.end();
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch {
        /* gone */
      }
      setTimeout(() => {
        if (child.pid !== undefined && alive(child.pid)) {
          try {
            child.kill('SIGKILL');
          } catch {
            /* gone */
          }
        }
      }, 3_000).unref();
    }, timeoutMs);
    const finish = (code, why) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      liveChildren.delete(child);
      const stdoutBuf = Buffer.concat(out);
      done({ code, stdout: stdoutBuf.toString('utf8'), stdoutBytes: stdoutBuf, stderr: Buffer.concat(err).toString('utf8'), timedOut, why });
    };
    child.on('error', (e) => finish(127, String(e?.message ?? e)));
    child.on('close', (code, signal) => finish(code ?? (signal === null ? 1 : 128), signal));
  });
}

/** The synchronous twin, for the preflight, the lists and the signal path only. */
function dockerSync(args, timeoutMs = 60_000) {
  const r = spawnSync(cliPath, args, { env: cliEnv, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? (r.error ? 127 : 1), stdout: String(r.stdout ?? ''), stderr: String(r.stderr ?? '') };
}

/** SIGKILL every docker CLI child still running. Blocking; the signal path only. */
function endChildrenSync() {
  for (const child of [...liveChildren]) {
    if (child.pid !== undefined && alive(child.pid)) {
      try {
        child.kill('SIGKILL');
      } catch {
        /* gone */
      }
    }
    liveChildren.delete(child);
  }
}

// ---------------------------------------------------------------------------
// Docker's lists, read before and after
// ---------------------------------------------------------------------------

/**
 * Docker's four lists, each sorted: images as `repo:tag id`, containers as
 * `name image`, volumes and networks by name. A container's STATUS is not
 * read, because his own containers' uptimes move while the run is going.
 */
export function readDockerLists() {
  const lines = (r) => r.stdout.split('\n').map((l) => l.trim()).filter((l) => l !== '').sort();
  const images = dockerSync(['images', '--no-trunc', '--format', '{{.Repository}}:{{.Tag}} {{.ID}}']);
  const containers = dockerSync(['ps', '-a', '--no-trunc', '--format', '{{.Names}} {{.Image}}']);
  const volumes = dockerSync(['volume', 'ls', '--format', '{{.Name}}']);
  const networks = dockerSync(['network', 'ls', '--format', '{{.Name}}']);
  const readable = [images, containers, volumes, networks].every((r) => r.code === 0);
  return {
    readable,
    images: lines(images),
    containers: lines(containers),
    volumes: lines(volumes),
    networks: lines(networks)
  };
}

/** Every line one list has that the other has not, per list. Pure. */
export function compareDockerLists(before, after) {
  const out = [];
  for (const key of ['images', 'containers', 'volumes', 'networks']) {
    const a = new Set(before[key] ?? []);
    const b = new Set(after[key] ?? []);
    for (const line of b) if (!a.has(line)) out.push(`${key}: ${line} is there now and was not before`);
    for (const line of a) if (!b.has(line)) out.push(`${key}: ${line} was there before and is gone now`);
  }
  return out;
}

/** The references of the before list's images, `repo:tag`. */
function beforeRefs(lists) {
  return new Set((lists.images ?? []).map((line) => line.split(' ')[0]));
}

function writeLists(dir, stem, lists) {
  for (const key of ['images', 'containers', 'volumes', 'networks']) {
    writeFileSync(join(dir, `${stem}-${key}.txt`), `${(lists[key] ?? []).join('\n')}\n`);
  }
}

function readListsFrom(dir, stem) {
  const lists = { readable: true };
  for (const key of ['images', 'containers', 'volumes', 'networks']) {
    const file = join(dir, `${stem}-${key}.txt`);
    lists[key] = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() !== '') : [];
    if (!existsSync(file)) lists.readable = false;
  }
  return lists;
}

// ---------------------------------------------------------------------------
// The lock and the ledger
// ---------------------------------------------------------------------------

/** Take the one lock, or say who holds it. A dead holder's lock is taken over. */
function takeLock(label) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const fd = openSync(LOCK_PATH, 'wx', 0o600);
      writeSync(fd, `${String(process.pid)} ${label} ${new Date().toISOString()}\n`);
      closeSync(fd);
      return null;
    } catch (err) {
      if (err?.code !== 'EEXIST') return `the Docker run lock ${LOCK_PATH} could not be made: ${String(err?.message ?? err)}`;
      const held = existsSync(LOCK_PATH) ? readFileSync(LOCK_PATH, 'utf8').trim() : '';
      const pid = Number(held.split(' ')[0]);
      if (Number.isInteger(pid) && pid > 1 && alive(pid)) {
        return `another Docker run holds ${LOCK_PATH} (${held}), and two runs at once could remove each other's pulls. Nothing was pulled or made.`;
      }
      say(`the lock ${LOCK_PATH} named a process that is gone (${held}); it is taken over`);
      try {
        unlinkSync(LOCK_PATH);
      } catch {
        /* raced */
      }
    }
  }
  return `the Docker run lock ${LOCK_PATH} could not be taken. Nothing was pulled or made.`;
}

function releaseLock() {
  try {
    const held = existsSync(LOCK_PATH) ? readFileSync(LOCK_PATH, 'utf8').trim() : '';
    if (Number(held.split(' ')[0]) === process.pid) unlinkSync(LOCK_PATH);
  } catch {
    /* already gone */
  }
}

/**
 * One line of the run's ledger, written BEFORE the command it names runs
 * (rule 1). `container <name>`, `pull <ref>`, `pulled <ref> <id>`.
 */
function ledger(entry, line) {
  appendFileSync(entry.ledgerPath, `${line}\n`);
}

function readLedger(path) {
  const out = { containers: [], pulls: [], pulled: new Map(), scratch: dirname(path) };
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const [kind, a, b] = line.trim().split(' ');
    if (kind === 'container' && a !== undefined) out.containers.push(a);
    if (kind === 'pull' && a !== undefined) out.pulls.push(a);
    if (kind === 'pulled' && a !== undefined && b !== undefined) out.pulled.set(a, b);
  }
  return out;
}

// ---------------------------------------------------------------------------
// The run argv, and the in-container scripts
// ---------------------------------------------------------------------------

/**
 * The one `docker run` argv (rule 4). Pure, exported so gate:docker and the
 * fixtures read the same text the run uses.
 *
 * @param {{name: string, ref: string, port: number, hostname: string, platform?: string|null}} spec
 */
export function runArgv(spec) {
  const argv = ['run', '-d', '--rm', '--pull', 'never', '--name', spec.name, '--hostname', spec.hostname];
  if (spec.platform !== null && spec.platform !== undefined) argv.push('--platform', spec.platform);
  argv.push('-p', `127.0.0.1:${String(spec.port)}:22`, spec.ref, 'sleep', String(MAIN_PROCESS_SECONDS));
  return argv;
}

/**
 * Why a composed run argv breaks rule 4, or null. The run asks it of itself,
 * with its OWN prefix, and `gate:docker` drives it over hostile argvs.
 *
 * Every spelling counts (the proof builder's hardening): a publish is exactly
 * ONE `-p 127.0.0.1:<port>:22` and never `--publish`, `-P`, an attached `-p…`
 * or a second one; a mount, a device or a host namespace is refused as a word,
 * as `--flag=value` and as an attached short flag (`-v/x:/y`).
 */
export function runArgvRefusal(argv, prefix = NAME_PREFIX) {
  if (!Array.isArray(argv) || argv[0] !== 'run') return 'not a run';
  const words = argv.map(String);
  if (!words.includes('--rm')) return 'no --rm';
  const pull = words.indexOf('--pull');
  if (pull === -1 || words[pull + 1] !== 'never') return 'no --pull never';
  const publishes = words.filter((a) => a === '-p' || a === '--publish' || /^--publish=/.test(a) || /^-p./.test(a) || a === '-P' || a === '--publish-all');
  if (publishes.length !== 1 || publishes[0] !== '-p') return 'not exactly one -p publish';
  const p = words.indexOf('-p');
  if (!/^127\.0\.0\.1:[1-9][0-9]{3,4}:22$/.test(words[p + 1] ?? '')) return 'no fixed -p 127.0.0.1:<port>:22';
  const LONG = ['--volume', '--mount', '--volumes-from', '--tmpfs', '--device', '--device-cgroup-rule', '--privileged', '--network', '--net', '--pid', '--ipc', '--uts', '--userns', '--cgroupns', '--cap-add', '--security-opt', '--gpus'];
  for (const a of words) {
    if (LONG.some((flag) => a === flag || a.startsWith(`${flag}=`))) return `a mount, a device, a host namespace or privileged (${a})`;
    if (a === '-v' || /^-v./.test(a)) return `a mount (${a})`;
    if (a.includes('docker.sock')) return 'the Docker socket';
  }
  const at = words.indexOf('--name');
  const name = at === -1 ? '' : words[at + 1] ?? '';
  if (typeof prefix !== 'string' || !PREFIX_RE.test(prefix) || !name.startsWith(prefix)) return 'a name without the run\'s own prefix';
  if (words[words.length - 2] !== 'sleep' || words[words.length - 1] !== String(MAIN_PROCESS_SECONDS)) return 'no bounded main process';
  return null;
}

/** What each package family installs, inside the container (rule 9). */
const INSTALL = Object.freeze({
  apt:
    'export DEBIAN_FRONTEND=noninteractive; apt-get update -qq >/dev/null && ' +
    'apt-get install -y -qq --no-install-recommends tmux openssh-server git procps ncurses-bin ca-certificates findutils coreutils >/dev/null',
  dnf: 'dnf -y -q install tmux openssh-server git procps-ng ncurses findutils coreutils shadow-utils >/dev/null',
  pacman: 'pacman -Syu --noconfirm --needed --disable-sandbox tmux dropbear git procps-ng ncurses findutils coreutils >/dev/null'
});

/**
 * The two accounts (SPEC D27): `tortie` with bash, `tortiesh` with the
 * distribution's own `useradd` default, each holding the run's public key on
 * standard input. `usermod -p '*'` leaves the account unlocked for a key and
 * gives it no password.
 */
const ACCOUNTS =
  'set -e; read -r pub; ' +
  'id tortie >/dev/null 2>&1 || useradd -m -s /bin/bash tortie; ' +
  'id tortiesh >/dev/null 2>&1 || useradd -m tortiesh; ' +
  'for u in tortie tortiesh; do usermod -p "*" "$u"; h=$(getent passwd "$u" | cut -d: -f6); ' +
  'mkdir -p "$h/.ssh"; printf "%s\\n" "$pub" > "$h/.ssh/authorized_keys"; chown -R "$u:" "$h/.ssh"; ' +
  'chmod 700 "$h/.ssh"; chmod 600 "$h/.ssh/authorized_keys"; done; ' +
  'getent passwd tortie tortiesh | cut -d: -f1,6,7';

/** The ssh server, started (again, after a restart). */
const SSHD = Object.freeze({
  openssh: 'mkdir -p /run/sshd && ssh-keygen -A >/dev/null 2>&1; /usr/sbin/sshd -E /tmp/sshd.log',
  dropbear: 'mkdir -p /etc/dropbear && /usr/bin/dropbear -R -p 22 2>>/tmp/dropbear.log'
});

/** What a booted machine clears, as a boot's tmpfiles would (SPEC §7.5 L6). */
const BOOT_CLEARS = 'rm -rf /tmp/tmux-*';

const FACTS =
  '. /etc/os-release 2>/dev/null; printf "os=%s\\n" "${PRETTY_NAME:-unknown}"; ' +
  'printf "arch=%s\\n" "$(uname -m)"; printf "tmux=%s\\n" "$(tmux -V 2>/dev/null)"; ' +
  'printf "stat=%s\\n" "$( (stat --version 2>&1 || true) | head -n 1)"; ' +
  'printf "sh=%s\\n" "$(readlink -f /bin/sh)"; printf "dash=%s\\n" "$(command -v dash || true)"';

// ---------------------------------------------------------------------------
// Ports
// ---------------------------------------------------------------------------

/** A free port on 127.0.0.1, chosen by binding 0 and closing. */
function freePort() {
  return new Promise((done, fail) => {
    const server = createServer();
    server.unref();
    server.on('error', fail);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => done(port));
    });
  });
}

// ---------------------------------------------------------------------------
// The teardown
// ---------------------------------------------------------------------------

/** Whether a container by this exact name still exists. */
function containerExistsSync(name) {
  return dockerSync(['container', 'inspect', '--format', '{{.Id}}', name], 30_000).code === 0;
}

/** The id an exact reference names now, or null. */
function imageIdSync(ref) {
  const r = dockerSync(['image', 'inspect', '--format', '{{.Id}}', ref], 30_000);
  const id = r.stdout.trim();
  return r.code === 0 && IMAGE_ID_RE.test(id) ? id : null;
}

/**
 * Remove one image this run pulled, by its exact reference, WITHOUT -f, only
 * when it is absent from the before list and its id is the one recorded at
 * its pull (rule 5).
 */
function removePulledImage(ref, recordedId, before, report) {
  if (before.has(ref)) {
    report.kept.push(ref + ' (in the before list)');
    return;
  }
  if (recordedId === undefined || !IMAGE_ID_RE.test(String(recordedId))) {
    report.problems.push(`${ref} was being pulled and no id was recorded, so it is left; remove it by hand if it is not his`);
    return;
  }
  const now = imageIdSync(ref);
  if (now === null) {
    report.imagesRemoved.push(`${ref} (already gone)`);
    return;
  }
  if (now !== recordedId) {
    report.problems.push(ref + ' now names ' + now + ', not ' + recordedId + " recorded at this run's pull, so it is left alone");
    return;
  }
  const r = dockerSync(['image', 'rm', ref], 120_000);
  if (r.code === 0) report.imagesRemoved.push(ref);
  else report.problems.push(`docker image rm ${ref} answered ${String(r.code)}: ${r.stderr.trim().slice(0, 200)}`);
}

/** Remove one container by its exact name, and wait until it is gone. */
function removeContainerSync(name, report) {
  if (!name.startsWith('tortie-')) {
    report.problems.push('refused to remove ' + name + ': it is not a name this file composes');
    return;
  }
  if (!containerExistsSync(name)) {
    report.containersRemoved.push(`${name} (already gone)`);
    return;
  }
  dockerSync(['rm', '-f', name], 120_000);
  const deadline = Date.now() + 30_000;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  while (containerExistsSync(name) && Date.now() < deadline) Atomics.wait(pause, 0, 0, 250);
  if (containerExistsSync(name)) report.problems.push(`${name} is still there after docker rm -f`);
  else report.containersRemoved.push(name);
}

/**
 * Remove everything the run made, then read Docker's lists and compare them
 * with the before lists. BLOCKING, so the same body serves the `finally`, the
 * signal net and `--sweep`; nothing here is served while it runs.
 */
function teardownSync(entry) {
  if (entry.torn) return entry.report;
  entry.torn = true;
  const report = { label: entry.label, containersRemoved: [], imagesRemoved: [], kept: [], problems: [], differences: [], clean: false };
  endChildrenSync();
  for (const name of [...entry.containers]) removeContainerSync(name, report);
  const before = beforeRefs(entry.before);
  for (const ref of [...entry.pulls]) removePulledImage(ref, entry.pulled.get(ref), before, report);
  const after = readDockerLists();
  writeLists(entry.scratch, 'after', after);
  if (!after.readable) report.problems.push('Docker would not list its images, containers, volumes or networks after the run');
  report.differences = compareDockerLists(entry.before, after);
  report.clean = report.problems.length === 0 && report.differences.length === 0 && after.readable;
  report.after = { containers: after.containers.filter((l) => l.startsWith(entry.prefix)).length, images: after.images.length };
  live.delete(entry.id);
  releaseLock();
  // Only the config folder this run made, by the exact path mkdtemp handed it.
  if (typeof entry.configDir === 'string' && entry.configDir.startsWith(join(entry.scratch, 'config-'))) {
    rmSync(entry.configDir, { recursive: true, force: true });
  }
  entry.report = report;
  lastReported = report;
  say(
    `${entry.label}: removed ${String(report.containersRemoved.length)} container(s) and ${String(report.imagesRemoved.length)} pulled image(s); ` +
      `Docker's lists ${report.differences.length === 0 ? 'read the same as before' : `DIFFER: ${report.differences.join('; ')}`}` +
      (report.problems.length > 0 ? `; PROBLEMS: ${report.problems.join('; ')}` : '')
  );
  return report;
}

/** Every live run, blocking. */
function endEverythingSync() {
  for (const entry of [...live.values()]) teardownSync(entry);
}

/**
 * The safety net, installed once and BEFORE the first pull or create (rule 7).
 * `exit` catches every `process.exit`, the three signals catch the ways a
 * person or a harness ends a run, and the two error events catch a throw that
 * escaped every `finally`. Each runs the blocking teardown, because Node runs
 * nothing asynchronous after `exit`.
 */
function installNet() {
  if (netInstalled) return;
  netInstalled = true;
  process.on('exit', () => {
    endEverythingSync();
  });
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => {
      endEverythingSync();
      process.exit(1);
    });
  }
  process.on('uncaughtException', (err) => {
    say(`uncaught: ${String(err?.stack ?? err)}`);
    endEverythingSync();
    process.exit(1);
  });
  process.on('unhandledRejection', (err) => {
    say(`unhandled rejection: ${String(err?.stack ?? err)}`);
    endEverythingSync();
    process.exit(1);
  });
}

/** The ordinary teardown, from the `finally`. */
async function teardown(entry) {
  // The CLI children this run still has are ended first, then everything is
  // removed by exact name. The removals are blocking on purpose: the body has
  // returned, nothing is served, and the same steps run from the net.
  for (const child of [...liveChildren]) {
    try {
      child.kill('SIGTERM');
    } catch {
      /* gone */
    }
  }
  await new Promise((r) => setTimeout(r, 200));
  return teardownSync(entry);
}

// ---------------------------------------------------------------------------
// The handle a body is given, one per row
// ---------------------------------------------------------------------------

const USER_RE = /^(?:root|tortie|tortiesh)$/;

function makeHandle(entry, spec) {
  const { name } = spec;
  /**
   * One command inside this container, as `user`. The argv is handed to
   * `docker exec` as it is; nothing is composed into a shell here.
   */
  const exec = async (argv, opts = {}) => {
    const user = opts.user ?? 'root';
    if (!USER_RE.test(user)) throw new Error(`${TAG} ${name}: "${String(user)}" is not one of the accounts this file made.`);
    const args = ['exec', '-i', '-u', user];
    if (opts.workdir !== undefined) args.push('-w', String(opts.workdir));
    for (const [k, v] of Object.entries(opts.env ?? {})) {
      if (!/^[A-Z_][A-Z0-9_]*$/.test(k)) throw new Error(`${TAG} ${name}: ${k} is not an environment name.`);
      args.push('-e', `${k}=${String(v)}`);
    }
    args.push(name, ...argv.map(String));
    return docker(args, { input: opts.input ?? null, timeoutMs: opts.timeoutMs ?? 120_000 });
  };
  const handle = {
    row: spec.row,
    name,
    ref: spec.ref,
    port: spec.port,
    platform: spec.platform ?? null,
    family: spec.family,
    sshd: spec.sshd,
    facts: {},
    accounts: {},
    exec,
    /** The same command, under the name measure:p342 and probe:p342 call it by. */
    run: exec,
    /** One `/bin/sh -c` script inside this container, as `user`. */
    sh(script, opts = {}) {
      return exec(['/bin/sh', '-c', script, 'p342', ...(opts.args ?? [])], opts);
    },
    /**
     * Write `content` to `path` inside this container as `user`, with `mode`.
     * The path is an argument, never composed into the script.
     */
    async writeFile(path, content, opts = {}) {
      const mode = (opts.mode ?? 0o644).toString(8);
      return exec(['/bin/sh', '-c', 'cat > "$1" && chmod "$2" "$1"', 'p342', path, mode], { ...opts, input: content });
    },
    /** Start the ssh server (again). */
    startSshd() {
      return exec(['/bin/sh', '-c', SSHD[spec.sshd]], { timeoutMs: 60_000 });
    },
    /**
     * `docker restart`: the machine reboots, its FIXED host port stays (rule
     * 4), `/tmp/tmux-*` is cleared as a boot's tmpfiles would, and sshd is
     * started again. The container is the same exact name; nothing is made.
     */
    async restart() {
      const r = await docker(['restart', '-t', '2', name], { timeoutMs: 120_000 });
      if (r.code !== 0) return r;
      await exec(['/bin/sh', '-c', BOOT_CLEARS], { timeoutMs: 30_000 });
      return handle.startSshd();
    },
    /** The published host port, read back from Docker. */
    async publishedPort() {
      const r = await docker(['port', name, '22/tcp'], { timeoutMs: 30_000 });
      const m = /127\.0\.0\.1:([0-9]+)/.exec(r.stdout);
      return m === null ? null : Number(m[1]);
    },
    /**
     * Write a stand-in for ssh at `file`, the carriage `measure:p342` hands the
     * SHIPPING exec plane (SPEC §7.4): it runs ONLY its last argument through
     * `/bin/sh -c` inside this container, as `user` in that account's home with
     * that account's shell, the way sshd runs a no-pty command, and logs each
     * string to `log` before it runs it. It names this container and nothing
     * else.
     */
    writeSshStandIn(file, opts = {}) {
      const user = opts.user ?? 'tortie';
      if (!USER_RE.test(user) || user === 'root') throw new Error(`${TAG} ${name}: the stand-in signs in as tortie or tortiesh.`);
      const account = handle.accounts[user];
      if (account === undefined) throw new Error(`${TAG} ${name}: ${user} was not made.`);
      const log = opts.log ?? `${file}.log`;
      const q = (s) => `'${String(s).replace(/'/g, `'\\''`)}'`;
      const env = Object.entries(cliEnv).map(([k, v]) => `${k}=${q(v)}`).join(' ');
      const text = [
        '#!/bin/sh',
        `# docker-run.mjs: an ssh stand-in for ${name}, as ${user}. Only its last argument runs.`,
        'for last; do :; done',
        `printf '%s\\n' "$last" >> ${q(log)}`,
        `exec /usr/bin/env -i ${env} ${q(cliPath)} exec -i -u ${q(user)} -w ${q(account.home)} ` +
          `-e SHELL=${q(account.shell)} -e USER=${q(user)} -e LOGNAME=${q(user)} -e HOME=${q(account.home)} ` +
          `${q(name)} /bin/sh -c "$last"`,
        ''
      ].join('\n');
      writeFileSync(file, text);
      chmodSync(file, 0o755);
      return { file, log };
    }
  };
  return handle;
}

// ---------------------------------------------------------------------------
// The one export that makes containers
// ---------------------------------------------------------------------------

/**
 * @typedef {object} ContainerOptions
 * @property {string}   label        Printed on every line this file writes.
 * @property {string[]} rows         Row ids of {@link ROWS}.
 * @property {string}   scratch      The run's directory: the ledger, the lists,
 *                                   the CLI's empty config. Refused inside the
 *                                   repository and under the person's home.
 * @property {string}   [runId]      Makes each name `<prefix><row>-<runId>`.
 * @property {string}   [publicKey]  One line, installed for both accounts.
 * @property {string}   [namePrefix] `tortie-<phase>-`, default NAME_PREFIX.
 * @property {Record<string, string[]>} [extraPackages] More packages per row id,
 *                                   installed inside that container.
 * @property {boolean}  [keep=false] Keep the scratch directory's lists.
 */

/**
 * Make one container per row, hand the handles to `body`, and remove every
 * container and every image this call pulled in a `finally` whatever `body`
 * did; then compare Docker's lists with the before lists and throw
 * {@link DockerTeardownMismatch} on any difference.
 *
 * @template T
 * @param {ContainerOptions} options
 * @param {(handles: Record<string, object>) => Promise<T>} body
 * @returns {Promise<T>}
 */
export async function withContainers(options, body) {
  const label = options?.label ?? 'docker';
  const prefix = options?.namePrefix ?? NAME_PREFIX;
  if (!PREFIX_RE.test(prefix)) throw new DockerRefused(`${TAG} ${label}: the name prefix "${prefix}" is not tortie-<phase>-.`);
  const rows = [...new Set(options?.rows ?? [])];
  for (const row of rows) {
    if (!ROW_ID_RE.test(row) || ROWS[row] === undefined) throw new DockerRefused(`${TAG} ${label}: "${row}" is not a row of ROWS.`);
  }
  const runId = options?.runId ?? `${String(process.pid)}-${String(nextId)}`;
  if (!RUN_ID_RE.test(runId)) throw new DockerRefused(`${TAG} ${label}: the run id "${runId}" is not a plain name.`);
  const scratchWhy = refuseScratchReason(options?.scratch);
  if (scratchWhy !== null) throw new DockerRefused(`${TAG} ${label}: ${scratchWhy}`);
  const scratch = resolve(options.scratch);
  const why = dockerPreflight(options);
  if (why !== null) throw new DockerRefused(`${TAG} ${label}: ${why}`);

  // The CLI's empty config, MADE FRESH (the proof builder's hardening): the
  // scratch folder first, then a folder of this run's own inside it, which is
  // the one folder the teardown removes. A fixed name could have been a folder
  // this run did not make.
  mkdirSync(scratch, { recursive: true, mode: 0o700 });
  const configDir = mkdtempSync(join(scratch, 'config-'));
  cliPath = findDockerCli();
  cliEnv = dockerEnvFor(configDir, null);
  // The endpoint, read once and pinned, so a probe that pointed HOME at
  // scratch still reaches the same daemon.
  const ctx = spawnSync(cliPath, ['context', 'inspect', '--format', '{{.Endpoints.docker.Host}}'], {
    encoding: 'utf8',
    timeout: 20_000,
    env: { PATH: String(process.env.PATH ?? ''), HOME: String(process.env.HOME ?? scratch) }
  });
  const host = String(ctx.stdout ?? '').trim();
  cliEnv = dockerEnvFor(configDir, /^unix:\/\/\//.test(host) ? host : null);
  const ping = dockerSync(['version', '--format', '{{.Server.Version}}'], 30_000);
  if (ping.code !== 0) throw new DockerRefused(`${TAG} ${label}: Docker did not answer (${ping.stderr.trim().slice(0, 200)}). Nothing was pulled or made.`);

  const lockWhy = takeLock(label);
  if (lockWhy !== null) throw new DockerRefused(`${TAG} ${label}: ${lockWhy}`);

  const id = nextId++;
  const before = readDockerLists();
  if (!before.readable) {
    releaseLock();
    throw new DockerRefused(`${TAG} ${label}: Docker would not list its images, containers, volumes and networks, so nothing could be compared afterwards. Nothing was pulled or made.`);
  }
  writeLists(scratch, 'before', before);
  const entry = {
    id,
    label,
    prefix,
    scratch,
    ledgerPath: join(scratch, 'docker.ledger'),
    configDir,
    before,
    containers: new Set(),
    pulls: new Set(),
    pulled: new Map(),
    keep: options?.keep === true,
    torn: false,
    report: null
  };
  writeFileSync(entry.ledgerPath, `# docker-run.mjs ledger, ${label}, pid ${String(process.pid)}, ${new Date().toISOString()}\n`);
  // Rule 7: the net BEFORE the first pull or create, and the entry registered
  // before it too, so a signal during either finds every ledgered name.
  installNet();
  live.set(id, entry);

  try {
    const haveRefs = beforeRefs(before);
    const handles = {};
    // Pulls, one exact reference at a time, ledgered first (rules 2, 3).
    for (const row of rows) {
      const spec = ROWS[row];
      if (!REF_RE.test(spec.ref)) throw new Error(`${TAG} ${label}: ${spec.ref} is not a reference this file pulls.`);
      // Rule 8: a reference his list holds is never pulled, which could re-tag it.
      if (haveRefs.has(spec.ref)) continue;
      if (entry.pulls.has(spec.ref)) continue;
      if (imageIdSync(spec.ref) !== null) continue;
      const free = freeKilobytes();
      if (free !== null && free < DOCKER_MIN_FREE_KB) throw new DockerRefused(`${TAG} ${label}: BLOCKED ON DISK before pulling ${spec.ref}: ${String(Math.floor(free / 1048576))} GB free.`);
      ledger(entry, `pull ${spec.ref}`);
      entry.pulls.add(spec.ref);
      const pullArgs = ['pull', '-q'];
      if (spec.platform !== undefined) {
        if (!PLATFORM_RE.test(spec.platform)) throw new Error(`${TAG} ${label}: ${spec.platform} is not a platform this file names.`);
        pullArgs.push('--platform', spec.platform);
      }
      pullArgs.push(spec.ref);
      const pulled = await docker(pullArgs, { timeoutMs: 900_000 });
      if (pulled.code !== 0) throw new Error(`${TAG} ${label}: docker pull ${spec.ref} answered ${String(pulled.code)}: ${pulled.stderr.trim().slice(0, 300)}`);
      const pulledId = imageIdSync(spec.ref);
      if (pulledId === null) throw new Error(`${TAG} ${label}: ${spec.ref} has no id after its pull.`);
      entry.pulled.set(spec.ref, pulledId);
      ledger(entry, `pulled ${spec.ref} ${pulledId}`);
      say(`${label}: pulled ${spec.ref} ${pulledId.slice(0, 19)}`);
    }
    // Creates, each ledgered before it runs (rules 1, 4).
    for (const row of rows) {
      const spec = ROWS[row];
      const name = `${prefix}${row}-${runId}`;
      if (containerExistsSync(name)) throw new Error(`${TAG} ${label}: a container named ${name} already exists, so this run could not tell its own from it.`);
      const port = await freePort();
      // Rule 3: a platform only for a reference his list does not hold.
      const platform = spec.platform !== undefined && !haveRefs.has(spec.ref) ? spec.platform : null;
      const argv = runArgv({ name, ref: spec.ref, port, hostname: `p342-${row}`, platform });
      const refusal = runArgvRefusal(argv, prefix);
      if (refusal !== null) throw new Error(`${TAG} ${label}: the run argv for ${row} breaks rule 4 (${refusal}).`);
      ledger(entry, `container ${name}`);
      entry.containers.add(name);
      const made = await docker(argv, { timeoutMs: 120_000 });
      if (made.code !== 0) throw new Error(`${TAG} ${label}: docker run ${name} answered ${String(made.code)}: ${made.stderr.trim().slice(0, 300)}`);
      handles[row] = makeHandle(entry, { row, name, ref: spec.ref, port, platform, family: spec.family, sshd: spec.sshd });
      say(`${label}: made ${name} from ${spec.ref}${platform !== null ? ` (${platform})` : ''} on 127.0.0.1:${String(port)}`);
    }
    // Installs inside, in parallel; then the accounts and the ssh server.
    const pub = String(options?.publicKey ?? '').trim();
    await Promise.all(
      rows.map(async (row) => {
        const h = handles[row];
        const spec = ROWS[row];
        const extra = (options?.extraPackages?.[row] ?? []).filter((p) => /^[a-z0-9][a-z0-9.+-]*$/.test(p));
        const install = extra.length === 0 ? INSTALL[spec.family] : `${INSTALL[spec.family].replace(/ >\/dev\/null$/, '')} ${extra.join(' ')} >/dev/null`;
        const started = Date.now();
        const r = await h.sh(install, { timeoutMs: 1_200_000 });
        if (r.code !== 0) throw new Error(`${TAG} ${label}: installing in ${h.name} answered ${String(r.code)}: ${(r.stderr || r.stdout).trim().slice(-400)}`);
        const accounts = await h.sh(ACCOUNTS, { input: `${pub === '' ? 'no-key' : pub}\n`, timeoutMs: 60_000 });
        if (accounts.code !== 0) throw new Error(`${TAG} ${label}: the accounts in ${h.name} answered ${String(accounts.code)}: ${accounts.stderr.trim().slice(0, 300)}`);
        for (const line of accounts.stdout.trim().split('\n')) {
          const [user, home, shell] = line.split(':');
          if (user !== undefined) h.accounts[user] = { home, shell };
        }
        if (pub !== '') {
          const sshd = await h.startSshd();
          if (sshd.code !== 0) throw new Error(`${TAG} ${label}: the ssh server in ${h.name} answered ${String(sshd.code)}: ${sshd.stderr.trim().slice(0, 300)}`);
        }
        const facts = await h.sh(FACTS, { timeoutMs: 30_000 });
        for (const line of facts.stdout.split('\n')) {
          const at = line.indexOf('=');
          if (at > 0) h.facts[line.slice(0, at)] = line.slice(at + 1);
        }
        say(`${label}: ${h.name} ready in ${String(Math.round((Date.now() - started) / 1000))} s: ${h.facts.os ?? '?'}, ${h.facts.tmux ?? '?'}, ${h.facts.arch ?? '?'}`);
      })
    );
    return await body(handles);
  } finally {
    // Whatever happened above, every container this call made and every image
    // it pulled is removed here by its exact name, and Docker's lists are read
    // and compared with the ones read before the first command. This block is
    // the reason this file exists.
    await teardown(entry);
    if (entry.report?.clean !== true) {
      process.exitCode = process.exitCode === 0 || process.exitCode === undefined ? 1 : process.exitCode;
    }
  }
}

/**
 * Throw when the run's teardown did not leave Docker as it found it. Call it
 * after {@link withContainers} returns, so a body's own error is never hidden
 * behind this one.
 */
export function assertDockerAsFound(report) {
  if (report?.clean !== true) {
    throw new DockerTeardownMismatch(`${TAG} Docker is not as this run found it: ${[...(report?.problems ?? []), ...(report?.differences ?? [])].join('; ')}`, report);
  }
}

/** The last run's report, for a caller that prints the proof. */
export function lastReport() {
  return lastReported;
}
let lastReported = null;
const originalTeardownSync = teardownSync;
void originalTeardownSync;

// ---------------------------------------------------------------------------
// --sweep <ledger>
// ---------------------------------------------------------------------------

/**
 * Remove a leaked run's containers and pulled images by EXACT name, from its
 * ledger, and compare Docker's lists with the before lists beside it.
 */
export function sweepLedger(path) {
  const ledgerPath = resolve(path);
  if (!existsSync(ledgerPath)) throw new DockerRefused(`${TAG} --sweep: ${ledgerPath} is not there.`);
  const scratchWhy = refuseScratchReason(dirname(ledgerPath));
  if (scratchWhy !== null) throw new DockerRefused(`${TAG} --sweep: ${scratchWhy}`);
  cliPath = findDockerCli();
  if (cliPath === null) throw new DockerRefused(`${TAG} --sweep: no docker program is on PATH.`);
  const configDir = mkdtempSync(join(dirname(ledgerPath), 'config-'));
  cliEnv = dockerEnvFor(configDir, null);
  const lockWhy = takeLock('sweep');
  if (lockWhy !== null) throw new DockerRefused(`${TAG} --sweep: ${lockWhy}`);
  const read = readLedger(ledgerPath);
  const before = readListsFrom(read.scratch, 'before');
  if (!before.readable) {
    releaseLock();
    throw new DockerRefused(`${TAG} --sweep: the before lists beside ${ledgerPath} are not all there, so nothing is removed.`);
  }
  const entry = {
    id: nextId++,
    label: `sweep ${ledgerPath}`,
    prefix: NAME_PREFIX,
    scratch: read.scratch,
    ledgerPath,
    configDir,
    before,
    containers: new Set(read.containers),
    pulls: new Set(read.pulls),
    pulled: read.pulled,
    keep: true,
    torn: false,
    report: null
  };
  installNet();
  live.set(entry.id, entry);
  return teardownSync(entry);
}

// ---------------------------------------------------------------------------
// Command line
// ---------------------------------------------------------------------------

const invokedDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const at = process.argv.indexOf('--sweep');
  if (at === -1 || process.argv[at + 1] === undefined) {
    process.stderr.write('usage: node build/docker-run.mjs --sweep <ledger>\n');
    process.exit(2);
  }
  try {
    const report = sweepLedger(process.argv[at + 1]);
    process.stdout.write(`${JSON.stringify(report, null, 1)}\n`);
    process.exit(report.clean ? 0 : 1);
  } catch (err) {
    process.stderr.write(`${String(err?.message ?? err)}\n`);
    process.exit(err?.exitCode ?? 1);
  }
}
