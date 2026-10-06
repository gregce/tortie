#!/usr/bin/env node
/**
 * `npm run probe:p340:script`. Phase 340's far check, run alone: the SHIPPING
 * `CHECK_SCRIPT` (src/main/machines/check-script.ts), read through the pinned
 * tsx by build/p340/far-check.mts, handed to real shells over scratch trees on
 * this Mac, its answer read by the SHIPPING `parseCheckAnswer` and
 * `classifyCheckOutput` (build/p340/SPEC.md §9.3).
 *
 * ## Why no far login shell, and why that is not a gap
 *
 * A machine runs the composed command as `$SHELL -c '<line>'` (sshd hands the
 * one string to the account's shell), and the check then asks that machine's
 * LOGIN shell with its own `"${SHELL:-/bin/sh}" -lc`. So every arm here does
 * exactly that, with no ssh: the OUTER shell is the far account's shell and
 * PARSES the quoted line, the INNER interpreter (`/bin/sh` on every machine
 * Tortie reaches, being bash on macOS and RHEL and dash on Debian and Ubuntu)
 * RUNS the script, and `SHELL` names a scratch login-shell stand-in, which the
 * script asks with `-lc` as it would ask the real one. Why not a far login
 * shell: the outer shell IS the far one's stand-in, and the script's own `-lc`
 * is the login shell. The stand-in is `/bin/zsh -d` (no global rc files, so
 * macOS's `/etc/zprofile` and its path_helper are not read and the login PATH
 * is the fixture's own `$ZDOTDIR/.zprofile` over the inherited one): a real
 * login zsh with its scratch files and nothing of this Mac's. The app run
 * (`probe:p340`, arms A1 and A2) is where a real far login shell is driven,
 * over the loopback machine's sshd.
 *
 * ## The fixtures, the adversary's F1 to F12 (scratchpad/p340/adversary/attack2.mjs)
 *
 *   F1   one program in an install folder only: found, NOT run (`vskip`).
 *   F2   none anywhere.
 *   F3   two distinct programs, a login-PATH stand-in and an install one:
 *        a choice, NOTHING run.
 *   F4   a link on the login PATH to the install one: ONE program (same
 *        device and inode), source login, run once.
 *   F5   a program on the login PATH only: found, run once.
 *   F6   a `~/` install folder, expanded against the far HOME: not run.
 *   F7a  a typed path: found, run once. F7b a typed path that is not there.
 *   F8   a whole fake block (and a path pair) printed BEFORE by the outer
 *        shell's rc file: malformed, `unknown`, nothing run.
 *   F9   the same printed AFTER, by an EXIT trap the outer zsh's `.zshenv`
 *        set (§Attack T1): malformed, `unknown`, nothing run.
 *   F10  a login-PATH folder whose name holds a newline: skipped, nothing run.
 *   F11  a glob on the login PATH (`set -f`): never expanded, nothing found.
 *   F12  a login-PATH folder with a space: found, run once.
 *
 * And three the verifiers' measurement added (the fix round): every one is a
 * program the schema could never take as a row's path, so the check skips it
 * before it is counted or run and answers the real program beside it, where
 * the first build refused the whole check as `unknown`.
 *
 *   F13  `bin` and `.` on the login PATH, each holding a program, beside an
 *        install one: the install one, nothing run.
 *   F14  a login-PATH folder whose name holds a single quote: skipped.
 *   F15  a login-PATH folder whose name holds a tab: skipped.
 *
 * And two for the fix round's typed reading, F8 and F9 with the path typed: a
 * check whose path the person typed reads the ONE block naming that path past
 * the hostile block, so the parent's way in (typing the path) still works.
 *
 *   F8t  F8's fake block BEFORE, path typed: ok, the typed program run once.
 *   F9t  F9's EXIT trap AFTER, path typed: ok, the typed program run once.
 *
 * Every outer shell reads the same view for these two, whether or not it read
 * the plant, because the typed answer is the same answer with the plant or
 * without it.
 *
 * Every stand-in program logs each run to its tree's own log, so "not run" is a
 * reading, never an assumption.
 *
 * ## The two matrices
 *
 *   inner  every fixture with the INNER interpreter varied over `/bin/sh`,
 *          `/bin/dash`, `/bin/ksh`, `/bin/zsh --emulate sh` and
 *          `/bin/bash --posix`, the outer `/bin/zsh` as sshd would run it on a
 *          Mac (§Attack: the adversary's 65 rows).
 *   outer  every fixture with the OUTER shell varied over `/bin/sh`, `bash`,
 *          `zsh`, `dash`, `ksh`, `csh` and `tcsh`, the inner `/bin/sh`
 *          (M14's shape: csh and tcsh parse the one line as today's probe).
 *
 * A row passes when its view is the fixture's expected view and its stand-in
 * log holds exactly the runs the view says. The rows of one fixture must also
 * AGREE across the matrix, except where an outer shell does not read the rc
 * file the fixture planted (F8 plants `.zshenv` and `.cshrc`; F9 an EXIT trap
 * in `.zshenv`), which is the outer shell's own startup and not the check's:
 * there the fixture is graded as the honest F1 it otherwise is, and the row
 * says so. busybox ash is not on this Mac and is read, not run.
 *
 * `conformance:machines` condition 127 imports {@link runArms} through
 * far-check.mts over the inner matrix with `/bin/sh`, `/bin/dash` and
 * `/bin/ksh`.
 *
 * ## What it starts, and what it touches
 *
 * One pinned tsx (far-check.mts), and inside it every shell above with
 * `spawnSync`, which waits for it, `killSignal: 'SIGKILL'` and a 20 s deadline,
 * and the stand-ins those shells run. No Electron, no ssh, no tmux, no agent,
 * no token. Every shell runs with an environment built from nothing: `PATH`,
 * a scratch `HOME`, a scratch `ZDOTDIR`, `HISTFILE=/dev/null`, `SHELL` the
 * stand-in, `TERM=dumb`, `LC_ALL=C`, and no `TERM_SESSION_ID`. Every tree is
 * under one `mkdtemp` in `/private/tmp`, removed in a `finally` and on SIGINT,
 * SIGTERM and SIGHUP. Nothing under the person's home is named.
 *
 * Exit 0 when every row passes and every fixture agrees, 1 on any failed row,
 * 2 when it cannot run (a shell missing, or the shipping module would not
 * load), with a sentence saying which. `P340_SCRIPT_REPORT=<path>` writes every
 * row as JSON for a verifier; `--self-test` grades recorded rows and starts
 * nothing.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tsxCli } from '../ts-runner.mjs';

const HERE = fileURLToPath(import.meta.url);
const REPO = resolve(dirname(HERE), '..', '..');
const TAG = '[p340-script]';
const J = JSON.stringify;

/** The inner interpreters: what RUNS the script (§9.3 as revised). */
export const INNERS = Object.freeze({
  sh: ['/bin/sh'],
  dash: ['/bin/dash'],
  ksh: ['/bin/ksh'],
  'zsh-as-sh': ['/bin/zsh', '--emulate', 'sh'],
  'bash-posix': ['/bin/bash', '--posix']
});

/** The outer shells: the far account's shell, which only PARSES the one line (M14). */
export const OUTERS = Object.freeze(['/bin/sh', '/bin/bash', '/bin/zsh', '/bin/dash', '/bin/ksh', '/bin/csh', '/bin/tcsh']);

/** Condition 127's inner set (§9.1: `ksh` added by the attack). */
export const GATE_INNERS = Object.freeze(['sh', 'dash', 'ksh']);

/** The outer shell the inner matrix runs under: a Mac account's shell. */
export const GATE_OUTER = '/bin/zsh';

/** The outer shells that read each planted rc file, by the fixture that plants it. */
const OUTERS_READING = Object.freeze({
  // `.zshenv` is read by every zsh; `~/.cshrc` by csh, and by tcsh when there
  // is no `~/.tcshrc`. sh, bash, dash and ksh read nothing for a `-c` line.
  'F8-fake-block-before': ['/bin/zsh', '/bin/csh', '/bin/tcsh'],
  // An EXIT trap is a zsh `.zshenv` here; csh has no EXIT trap.
  'F9-fake-block-after': ['/bin/zsh']
});

/**
 * The fake block a hostile rc file prints: a WHOLE, well-formed block naming
 * `/evil/tmux` with a measured version, every line the script's own, so the
 * only thing that refuses it is the count of markers (§Attack T1: the draft's
 * last-block reader named exactly this, in every interpreter). A fake block
 * missing a line would be refused by the shape rules alone, and an ablation
 * reading the last block would then stay green.
 */
const FAKE_BLOCK_ARGS =
  '__TORTIE_CHECK__ user=evil os=Darwin login=read "cand=login /evil/tmux" count=1 "version=tmux 3.6a" __TORTIE_PATH__/evil/tmux__TORTIE_PATH__ __TORTIE_CHECK__';

/** A stand-in program that logs every run to `log`, then prints `tmux <v>`. */
function standin(dir, version, log) {
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const path = join(dir, 'tmux');
  writeFileSync(path, `#!/bin/sh\necho "RAN $0 $*" >> '${log}'\necho "tmux ${version}"\n`, { mode: 0o755 });
  chmodSync(path, 0o755);
  return path;
}

/** A `.zprofile` line putting `dir` first on the login PATH, single quoted as the adversary wrote it. */
const loginFirst = (dir) => `PATH='${dir}':"$PATH"\n`;

/**
 * The eighteen fixtures. `setup(t)` builds the tree and answers the typed path
 * and the install folders; `expect(t)` the honest view, every path absolute
 * and real. `t` is `{ root, home, zdot, log }`.
 */
export const FIXTURES = Object.freeze([
  {
    id: 'F1-install-only',
    setup: (t) => {
      standin(join(t.root, 'inst'), '3.6a', t.log);
      return { typed: null, folders: [join(t.root, 'inst')] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`install ${t.root}/inst/tmux`], typedMissing: false, version: null, versionKind: 'not-read', ran: 0 })
  },
  {
    id: 'F2-none',
    setup: (t) => {
      mkdirSync(join(t.root, 'e'), { recursive: true });
      return { typed: null, folders: [join(t.root, 'e')] };
    },
    expect: () => ({ klass: 'no-program', candidates: [], typedMissing: false, version: null, versionKind: null, ran: 0 })
  },
  {
    id: 'F3-two-distinct',
    setup: (t) => {
      standin(join(t.root, 'lb'), '3.6a', t.log);
      standin(join(t.root, 'inst'), '3.6b', t.log);
      writeFileSync(join(t.zdot, '.zprofile'), loginFirst(join(t.root, 'lb')));
      return { typed: null, folders: [join(t.root, 'inst')] };
    },
    expect: (t) => ({
      klass: 'program-choice',
      candidates: [`login ${t.root}/lb/tmux`, `install ${t.root}/inst/tmux`],
      typedMissing: false,
      version: null,
      versionKind: null,
      ran: 0
    })
  },
  {
    id: 'F4-link-same-file',
    setup: (t) => {
      const real = standin(join(t.root, 'inst'), '3.6a', t.log);
      mkdirSync(join(t.root, 'lb'), { recursive: true });
      symlinkSync(real, join(t.root, 'lb', 'tmux'));
      writeFileSync(join(t.zdot, '.zprofile'), loginFirst(join(t.root, 'lb')));
      return { typed: null, folders: [join(t.root, 'inst')] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`login ${t.root}/lb/tmux`], typedMissing: false, version: '3.6a', versionKind: 'read', ran: 1 })
  },
  {
    id: 'F5-login-only',
    setup: (t) => {
      standin(join(t.root, 'lb'), '3.7c', t.log);
      writeFileSync(join(t.zdot, '.zprofile'), loginFirst(join(t.root, 'lb')));
      mkdirSync(join(t.root, 'e'), { recursive: true });
      return { typed: null, folders: [join(t.root, 'e')] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`login ${t.root}/lb/tmux`], typedMissing: false, version: '3.7c', versionKind: 'read', ran: 1 })
  },
  {
    id: 'F6-home-tilde',
    setup: (t) => {
      standin(join(t.home, '.local', 'bin'), '3.6a', t.log);
      return { typed: null, folders: ['~/.local/bin'] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`install ${t.home}/.local/bin/tmux`], typedMissing: false, version: null, versionKind: 'not-read', ran: 0 })
  },
  {
    id: 'F7a-typed',
    setup: (t) => {
      const typed = standin(join(t.root, 'odd'), '3.9z', t.log);
      return { typed, folders: [join(t.root, 'odd')] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`typed ${t.root}/odd/tmux`], typedMissing: false, version: '3.9z', versionKind: 'read', ran: 1 })
  },
  {
    id: 'F7b-typed-missing',
    setup: (t) => ({ typed: join(t.root, 'nothing', 'tmux'), folders: [] }),
    expect: () => ({ klass: 'no-program', candidates: [], typedMissing: true, version: null, versionKind: null, ran: 0 })
  },
  {
    id: 'F8-fake-block-before',
    setup: (t) => {
      standin(join(t.root, 'inst'), '3.6a', t.log);
      writeFileSync(join(t.zdot, '.zshenv'), `printf "%s\\n" ${FAKE_BLOCK_ARGS}\n`);
      writeFileSync(join(t.home, '.cshrc'), `printf "%s\\n" ${FAKE_BLOCK_ARGS}\n`);
      return { typed: null, folders: [join(t.root, 'inst')] };
    },
    expect: () => ({ klass: 'unknown', malformed: true, candidates: null, typedMissing: null, version: null, versionKind: null, ran: 0 })
  },
  {
    id: 'F9-fake-block-after',
    setup: (t) => {
      standin(join(t.root, 'inst'), '3.6a', t.log);
      writeFileSync(join(t.zdot, '.zshenv'), `trap 'printf "%s\\n" ${FAKE_BLOCK_ARGS}' EXIT\n`);
      return { typed: null, folders: [join(t.root, 'inst')] };
    },
    expect: () => ({ klass: 'unknown', malformed: true, candidates: null, typedMissing: null, version: null, versionKind: null, ran: 0 })
  },
  {
    id: 'F10-newline-folder',
    setup: (t) => {
      const weird = join(t.root, 'x\nversion=tmux 3.6a');
      standin(weird, '9.9z', t.log);
      writeFileSync(join(t.zdot, '.zprofile'), loginFirst(weird));
      mkdirSync(join(t.root, 'e'), { recursive: true });
      return { typed: null, folders: [join(t.root, 'e')] };
    },
    expect: () => ({ klass: 'no-program', candidates: [], typedMissing: false, version: null, versionKind: null, ran: 0 })
  },
  {
    id: 'F11-glob',
    setup: (t) => {
      standin(join(t.root, 'g1'), '3.6a', t.log);
      standin(join(t.root, 'g2'), '3.6b', t.log);
      writeFileSync(join(t.zdot, '.zprofile'), `PATH='${t.root}/g*':"$PATH"\n`);
      mkdirSync(join(t.root, 'e'), { recursive: true });
      return { typed: null, folders: [join(t.root, 'e')] };
    },
    expect: () => ({ klass: 'no-program', candidates: [], typedMissing: false, version: null, versionKind: null, ran: 0 })
  },
  {
    id: 'F12-space',
    setup: (t) => {
      standin(join(t.root, 'with space'), '3.6a', t.log);
      writeFileSync(join(t.zdot, '.zprofile'), loginFirst(join(t.root, 'with space')));
      mkdirSync(join(t.root, 'e'), { recursive: true });
      return { typed: null, folders: [join(t.root, 'e')] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`login ${t.root}/with space/tmux`], typedMissing: false, version: '3.6a', versionKind: 'read', ran: 1 })
  },
  {
    // The fix round. `bin` and `.` resolve against the far start folder, which
    // is the home (the cwd every arm runs in, as sshd makes it). Each holds a
    // logging program; neither may be counted, and the install one is not run.
    id: 'F13-relative-login',
    setup: (t) => {
      standin(join(t.home, 'bin'), '9.9a', t.log);
      standin(t.home, '9.9b', t.log);
      standin(join(t.root, 'inst'), '3.6a', t.log);
      writeFileSync(join(t.zdot, '.zprofile'), 'PATH=bin:.:"$PATH"\n');
      return { typed: null, folders: [join(t.root, 'inst')] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`install ${t.root}/inst/tmux`], typedMissing: false, version: null, versionKind: 'not-read', ran: 0 })
  },
  {
    id: 'F14-quote-folder',
    setup: (t) => {
      const quoted = join(t.root, "o'brien");
      standin(quoted, '9.9c', t.log);
      standin(join(t.root, 'inst'), '3.6a', t.log);
      writeFileSync(join(t.zdot, '.zprofile'), `PATH="${quoted}":"$PATH"\n`);
      return { typed: null, folders: [join(t.root, 'inst')] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`install ${t.root}/inst/tmux`], typedMissing: false, version: null, versionKind: 'not-read', ran: 0 })
  },
  {
    id: 'F15-tab-folder',
    setup: (t) => {
      const tabbed = join(t.root, 'a\tb');
      standin(tabbed, '9.9d', t.log);
      standin(join(t.root, 'inst'), '3.6a', t.log);
      writeFileSync(join(t.zdot, '.zprofile'), `PATH="${tabbed}":"$PATH"\n`);
      return { typed: null, folders: [join(t.root, 'inst')] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`install ${t.root}/inst/tmux`], typedMissing: false, version: null, versionKind: 'not-read', ran: 0 })
  },
  {
    // The fix round's typed reading over F8's plant.
    id: 'F8t-typed-past-block-before',
    setup: (t) => {
      const typed = standin(join(t.root, 'odd'), '3.6a', t.log);
      writeFileSync(join(t.zdot, '.zshenv'), `printf "%s\\n" ${FAKE_BLOCK_ARGS}\n`);
      writeFileSync(join(t.home, '.cshrc'), `printf "%s\\n" ${FAKE_BLOCK_ARGS}\n`);
      return { typed, folders: [] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`typed ${t.root}/odd/tmux`], typedMissing: false, version: '3.6a', versionKind: 'read', ran: 1 })
  },
  {
    // The fix round's typed reading over F9's EXIT trap.
    id: 'F9t-typed-past-trap-after',
    setup: (t) => {
      const typed = standin(join(t.root, 'odd'), '3.6a', t.log);
      writeFileSync(join(t.zdot, '.zshenv'), `trap 'printf "%s\\n" ${FAKE_BLOCK_ARGS}' EXIT\n`);
      return { typed, folders: [] };
    },
    expect: (t) => ({ klass: 'ok', candidates: [`typed ${t.root}/odd/tmux`], typedMissing: false, version: '3.6a', versionKind: 'read', ran: 1 })
  }
]);

/** The fixture ids, in order. */
export const FIXTURE_IDS = Object.freeze(FIXTURES.map((f) => f.id));

/** True when `outer` reads the rc file `fixtureId` planted, so the hostile bytes reach the answer. */
export function outerReadsPlant(fixtureId, outer) {
  const readers = OUTERS_READING[fixtureId];
  return readers === undefined ? true : readers.includes(outer);
}

/**
 * The view a row must read. A planting fixture whose rc file this outer shell
 * does not read is graded as the honest program it otherwise holds, which is
 * F1's view over the same tree.
 */
export function expectedView(fixtureId, outer, tree) {
  const fixture = FIXTURES.find((f) => f.id === fixtureId);
  if (fixture === undefined) throw new Error(`no fixture ${fixtureId}`);
  if (!outerReadsPlant(fixtureId, outer)) return FIXTURES[0].expect(tree);
  return fixture.expect(tree);
}

/** The login-shell stand-in: a real login zsh with no global rc files. */
export const LOGIN_STANDIN =
  '#!/bin/sh\n' +
  '# Phase 340: the far login shell stand-in. A real login zsh (`-l` comes from\n' +
  '# the check itself, `-lc`) with the global rc files off (`-d`), so this Mac\'s\n' +
  "# /etc/zprofile and its path_helper are not read and the login PATH is the\n" +
  '# fixture\'s own $ZDOTDIR/.zprofile over the inherited PATH.\n' +
  'exec /bin/zsh -d "$@"\n';

/** The environment every shell gets, built from nothing. */
export function shellEnv(tree, loginShell) {
  return {
    PATH: '/usr/bin:/bin:/usr/sbin:/sbin',
    HOME: tree.home,
    ZDOTDIR: tree.zdot,
    HISTFILE: '/dev/null',
    SHELL: loginShell,
    TERM: 'dumb',
    LC_ALL: 'C'
  };
}

/** The shells this matrix needs and the host lacks; empty when it can run. */
export function missingShells(inners = Object.keys(INNERS), outers = OUTERS) {
  const need = new Set([...inners.map((n) => INNERS[n][0]), ...outers, '/bin/zsh']);
  return [...need].filter((p) => !existsSync(p));
}

/**
 * Run the matrix. Called INSIDE the tsx process (build/p340/far-check.mts),
 * because `compose`, `parse` and `classify` are the shipping TypeScript.
 *
 *  - `compose(innerArgv, typed, folders)`: the command line exactly as the
 *    product quotes it, with the fixture's own folders and interpreter.
 *  - `view(stdout, exitCode)`: the shipping reader's answer, normalised to
 *    `{ malformed, klass, candidates, typedMissing, version, versionKind }`.
 *  - `matrix`: `[{ inner: <INNERS key>, outer: <path> }]`.
 *
 * Every tree is under one mkdtemp removed in the `finally`; a row is
 * `{ fixture, inner, outer, exit, ms, stdout, stderr, ran, view, expected }`,
 * every path in it written relative to `$T` (the tree root) and `$H` (its home)
 * so two rows of one fixture compare.
 */
export function runArms({ compose, view, matrix, only = [] }) {
  const scratch = realpathSync(mkdtempSync(join('/private/tmp', `p340-script-${String(process.pid)}-`)));
  const onSignal = () => {
    try {
      rmSync(scratch, { recursive: true, force: true });
    } finally {
      process.exit(130);
    }
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, onSignal);
  const rows = [];
  try {
    const loginShell = join(scratch, 'loginsh');
    writeFileSync(loginShell, LOGIN_STANDIN, { mode: 0o755 });
    chmodSync(loginShell, 0o755);
    let n = 0;
    for (const fixture of FIXTURES) {
      if (only.length > 0 && !only.includes(fixture.id)) continue;
      for (const { inner, outer } of matrix) {
        n += 1;
        const root = join(scratch, `t${String(n)}`);
        const tree = { root, home: join(root, 'home'), zdot: join(root, 'zdot'), log: join(root, 'standin.log') };
        mkdirSync(tree.home, { recursive: true, mode: 0o700 });
        mkdirSync(tree.zdot, { recursive: true, mode: 0o700 });
        const { typed, folders } = fixture.setup(tree);
        const line = compose(INNERS[inner], typed, folders);
        const t0 = Date.now();
        const r = spawnSync(outer, ['-c', line], {
          cwd: tree.home,
          env: shellEnv(tree, loginShell),
          encoding: 'utf8',
          timeout: 20_000,
          killSignal: 'SIGKILL',
          maxBuffer: 4 * 1024 * 1024
        });
        const ms = Date.now() - t0;
        const stdout = String(r.stdout ?? '');
        const ranLines = existsSync(tree.log) ? readFileSync(tree.log, 'utf8').split('\n').filter((l) => l.trim() !== '') : [];
        const exit = r.status ?? -1;
        // The typed path is handed to the reader as the runner hands it (the
        // fix round: with one, the block naming it is read past others).
        const got = view(stdout, exit, typed);
        const want = expectedView(fixture.id, outer, tree);
        const rel = (v) => JSON.parse(J(v).replaceAll(tree.home, '$H').replaceAll(tree.root, '$T'));
        rows.push({
          fixture: fixture.id,
          inner,
          outer,
          exit,
          ms,
          signal: r.signal ?? null,
          stdout: rel(stdout),
          stderr: rel(String(r.stderr ?? '').slice(0, 400)),
          ran: ranLines.length,
          ranLines: rel(ranLines),
          view: rel(got),
          expected: rel(want),
          plantRead: outerReadsPlant(fixture.id, outer)
        });
      }
    }
  } finally {
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(sig, onSignal);
    rmSync(scratch, { recursive: true, force: true });
  }
  return rows;
}

/**
 * The problems with one row, as sentences; empty when it passes. The view is
 * compared field by field, so a row names WHAT it read differently.
 */
export function rowProblems(row) {
  const out = [];
  const where = `${row.fixture} under ${row.inner} inside ${row.outer}`;
  const want = row.expected;
  const got = row.view ?? {};
  if (row.signal !== null && row.signal !== undefined) out.push(`${where}: the shell was ended by ${row.signal} at the 20 s deadline`);
  if (got.klass !== want.klass) out.push(`${where}: the class is ${J(got.klass)}, not ${J(want.klass)}`);
  if (want.malformed === true) {
    if (got.malformed !== true) out.push(`${where}: the reader took a block it should have refused as malformed (${J(got.candidates)})`);
  } else {
    if (got.malformed === true) out.push(`${where}: the reader refused an honest answer as malformed`);
    if (J(got.candidates) !== J(want.candidates)) out.push(`${where}: the candidates are ${J(got.candidates)}, not ${J(want.candidates)}`);
    if (got.typedMissing !== want.typedMissing) out.push(`${where}: typedMissing is ${J(got.typedMissing)}, not ${J(want.typedMissing)}`);
    if (got.version !== want.version) out.push(`${where}: the version is ${J(got.version)}, not ${J(want.version)}`);
    const kindOk =
      want.versionKind === 'read' ? ['measured', 'unmeasured'].includes(got.versionKind) : got.versionKind === want.versionKind;
    if (!kindOk) out.push(`${where}: the version kind is ${J(got.versionKind)}, not ${want.versionKind === 'read' ? 'measured or unmeasured' : J(want.versionKind)}`);
  }
  if (row.ran !== want.ran) {
    out.push(
      `${where}: the stand-in log holds ${String(row.ran)} run(s) where the view says ${String(want.ran)}` +
        (row.ran > want.ran ? `, so a program ran that the check reports as not run (${J(row.ranLines.slice(0, 2))})` : '')
    );
  }
  return out;
}

/**
 * The rows of one fixture must agree across the matrix wherever the planted
 * rc file reached them alike: same class, same candidates, same runs.
 */
export function agreementProblems(rows) {
  const out = [];
  const byKey = new Map();
  for (const row of rows) {
    const key = `${row.fixture}|${String(row.plantRead)}`;
    byKey.set(key, [...(byKey.get(key) ?? []), row]);
  }
  for (const [key, group] of byKey) {
    const answers = new Set(group.map((r) => J({ klass: r.view?.klass, candidates: r.view?.candidates, version: r.view?.version, ran: r.ran })));
    if (answers.size > 1) {
      out.push(`${key.split('|')[0]}: the shells disagree, ${[...answers].slice(0, 3).join(' against ')} (${group.map((r) => `${r.inner}/${r.outer.split('/').pop()}`).join(', ')})`);
    }
  }
  return out;
}

/** The full matrix §9.3 names: every inner under zsh, and every outer around /bin/sh. */
export function fullMatrix() {
  const out = Object.keys(INNERS).map((inner) => ({ inner, outer: GATE_OUTER }));
  for (const outer of OUTERS) if (outer !== GATE_OUTER) out.push({ inner: 'sh', outer });
  return out;
}

/** Condition 127's matrix: /bin/sh, /bin/dash and /bin/ksh inside zsh. */
export function gateMatrix() {
  return GATE_INNERS.map((inner) => ({ inner, outer: GATE_OUTER }));
}

/** Read the shipping texts and run a matrix in the pinned tsx; the parsed JSON, or a reason it could not. */
export function loadFarCheck(mode, cwd = REPO, env = {}) {
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p340/far-check.mts', mode], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    timeout: 300_000,
    env: { ...process.env, ...env }
  });
  const last = String(r.stdout ?? '').trimEnd().split('\n').filter((l) => l.startsWith('{')).pop();
  try {
    if (last === undefined) throw new Error('no JSON');
    return JSON.parse(last);
  } catch {
    return { loadErrors: { farCheck: `build/p340/far-check.mts printed no JSON (exit ${String(r.status)}): ${String(r.stderr ?? '').trim().split('\n').slice(-3).join(' | ').slice(0, 400)}` }, rows: [] };
  }
}

// ---------------------------------------------------------------------------
// The self-test: the graders over recorded rows. Starts nothing.
// ---------------------------------------------------------------------------

function selfTest() {
  const honest = (fixture, view, ran, plantRead = true) => ({
    fixture,
    inner: 'sh',
    outer: '/bin/zsh',
    signal: null,
    ran,
    ranLines: Array.from({ length: ran }, () => 'RAN $T/x/tmux -V'),
    plantRead,
    view,
    expected: expectedView(fixture, plantRead ? '/bin/zsh' : '/bin/sh', { root: '$T', home: '$H', zdot: '$T/zdot', log: '$T/log' })
  });
  const F1 = { malformed: false, klass: 'ok', candidates: ['install $T/inst/tmux'], typedMissing: false, version: null, versionKind: 'not-read' };
  const F3 = { malformed: false, klass: 'program-choice', candidates: ['login $T/lb/tmux', 'install $T/inst/tmux'], typedMissing: false, version: null, versionKind: null };
  const F4 = { malformed: false, klass: 'ok', candidates: ['login $T/lb/tmux'], typedMissing: false, version: '3.6a', versionKind: 'measured' };
  const F9 = { malformed: true, klass: 'unknown', candidates: null, typedMissing: null, version: null, versionKind: null };
  const cases = [
    ['an honest install-only row passes', rowProblems(honest('F1-install-only', F1, 0)).length, 0],
    ['an install-only row that RAN its program fails', rowProblems(honest('F1-install-only', F1, 1)).length > 0, true],
    ['a choice row that ran nothing passes', rowProblems(honest('F3-two-distinct', F3, 0)).length, 0],
    ['a choice row that ran a stand-in fails', rowProblems(honest('F3-two-distinct', F3, 1)).length > 0, true],
    ['the link row reads one program', rowProblems(honest('F4-link-same-file', F4, 1)).length, 0],
    ['the link row read as two fails', rowProblems(honest('F4-link-same-file', { ...F4, klass: 'program-choice', candidates: ['login $T/lb/tmux', 'install $T/inst/tmux'], version: null, versionKind: null }, 0)).length > 0, true],
    ['the trap row read as malformed passes', rowProblems(honest('F9-fake-block-after', F9, 0)).length, 0],
    ['the trap row read as the evil program fails', rowProblems(honest('F9-fake-block-after', { malformed: false, klass: 'ok', candidates: ['install /evil/tmux'], typedMissing: false, version: '3.6a', versionKind: 'measured' }, 0)).length > 0, true],
    ['a trap fixture an outer shell does not read is graded as F1', rowProblems(honest('F9-fake-block-after', F1, 0, false)).length, 0],
    ['two shells reading one fixture differently disagree', agreementProblems([honest('F4-link-same-file', F4, 1), { ...honest('F4-link-same-file', F4, 1), inner: 'dash', view: { ...F4, candidates: ['login $T/lb/tmux', 'install $T/inst/tmux'] } }]).length, 1],
    ['an outer that read the plant and one that did not are not compared', agreementProblems([honest('F9-fake-block-after', F9, 0), honest('F9-fake-block-after', F1, 0, false)]).length, 0],
    ['eighteen fixtures', FIXTURES.length, 18],
    ['the full matrix is five inners and six more outers', fullMatrix().length, 11],
    ['the gate matrix is sh, dash and ksh inside zsh', J(gateMatrix()), J([{ inner: 'sh', outer: '/bin/zsh' }, { inner: 'dash', outer: '/bin/zsh' }, { inner: 'ksh', outer: '/bin/zsh' }])]
  ];
  let ok = true;
  for (const [label, got, want] of cases) {
    const good = J(got) === J(want);
    ok = ok && good;
    process.stdout.write(`${TAG} ${good ? 'ok  ' : 'BAD '} ${label}: ${J(got)}${good ? '' : ` want ${J(want)}`}\n`);
  }
  process.stdout.write(`${TAG} self-test ${ok ? 'PASS' : 'FAIL'}: ${String(cases.length)} fixtures\n`);
  return ok;
}

// ---------------------------------------------------------------------------
// The program
// ---------------------------------------------------------------------------

const runAsProgram = process.argv[1] !== undefined && resolve(process.argv[1]) === HERE;
if (runAsProgram) {
  if (process.argv.includes('--self-test')) process.exit(selfTest() ? 0 : 1);
  const say = (line) => process.stdout.write(`${TAG} ${line}\n`);
  const missing = missingShells();
  if (missing.length > 0) {
    say(`CANNOT RUN: ${missing.join(', ')} not on this Mac.`);
    process.exit(2);
  }
  const started = Date.now();
  const got = loadFarCheck('--full');
  const errors = Object.values(got.loadErrors ?? {});
  if (errors.length > 0) {
    for (const e of errors) say(`CANNOT RUN: ${String(e)}`);
    process.exit(2);
  }
  const rows = got.rows ?? [];
  if (process.env['P340_SCRIPT_REPORT']) writeFileSync(process.env['P340_SCRIPT_REPORT'], `${J({ texts: got.texts ?? null, rows }, null, 1)}\n`);
  say(`the shipping check is ${String(got.texts?.bytes ?? '?')} bytes; ${String(rows.length)} rows over ${String(FIXTURES.length)} fixtures`);
  const problems = [];
  for (const row of rows) {
    const p = rowProblems(row);
    problems.push(...p);
    const v = row.view ?? {};
    say(
      `${row.fixture.padEnd(21)} ${row.inner.padEnd(10)} ${row.outer.split('/').pop().padEnd(5)} ${String(row.ms).padStart(4)} ms ` +
        `${String(v.klass).padEnd(15)} ${J(v.candidates)} ${v.version ?? '-'} ${v.versionKind ?? '-'} ran=${String(row.ran)}` +
        `${row.plantRead ? '' : ' (this outer does not read the plant)'}${p.length === 0 ? '' : '  FAIL'}`
    );
  }
  problems.push(...agreementProblems(rows));
  const want = FIXTURES.length * fullMatrix().length;
  if (rows.length !== want) problems.push(`${String(rows.length)} rows ran where ${String(want)} were asked for`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length > 0) {
    say(`FAIL in ${seconds} s, ${String(problems.length)}:`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  say(
    `PASS in ${seconds} s. Every fixture read as the spec says under ${Object.keys(INNERS).length} inner interpreters and ` +
      `${String(OUTERS.length)} outer shells, every shell agreed, and no stand-in ran that the view says did not. ` +
      'No ssh, no Electron, no tmux; every tree removed.'
  );
}
