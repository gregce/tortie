#!/usr/bin/env node
/**
 * build/p343/fixture.mjs. The tree of links `probe:p343` drives, made in node
 * (build/p343/SPEC.md §9.3). It is the entry's `make-fixture.sh` (the issue's
 * own `.claude/skills -> ../.agent/skills` and the eighteen hostile links) plus
 * the attack's additions, written with `node:fs` calls and NO SHELL: the two
 * programs it starts are `git`, with a scratch HOME, `GIT_CONFIG_NOSYSTEM=1` and
 * `GIT_CONFIG_GLOBAL=/dev/null` so neither the system's nor his own git config
 * is read, and `/usr/bin/mkfifo` for the one FIFO, which node cannot make.
 *
 * ## The shapes, under `<dir>` (which must not exist yet)
 *
 *   proj/                       the project, a committed git repository
 *     .claude/skills -> ../.agent/skills    the issue's link, and the only
 *                                            entry of `.claude/`
 *     .agent/skills/{a-skill/SKILL.md, notes.md}
 *     src/index.ts, src/linkIgnored -> ../node_modules/pkg
 *     linkIn -> src, linkInAbs -> <proj>/src, linkOut -> ../outside,
 *     linkOutAbs -> <dir>/outside, linkFile -> src/index.ts,
 *     linkFileOut -> ../outside/secret.txt, dangling -> nothing-here,
 *     self -> self, loopRoot -> ., up -> .., linkFsRoot -> /,
 *     linkHome -> <home>, linkSsh -> <home>/.ssh, linkDotGit -> .git,
 *     linkOther -> ../other, chainA -> chainB, chainB -> .agent/skills
 *     .venv -> ../outside and bazel-out -> ../outside/sub, both ignored
 *     node_modules/{pkg/index.js, .pnpm/pkgb/b.js}, node_modules/pkgb -> .pnpm/pkgb
 *     linkVarRoot -> /var/root, linkLocked -> ../locked (mode 0300),
 *     linkGone -> ../gone, linkPipe -> pipe (a FIFO, made after the commit)
 *     deep/a/b/c/d.txt          a folder at the far walk's last level (R0)
 *     tenTargets/t0..t9/f.txt and ten/l0..l9 -> ../tenTargets/t<i>  (R4)
 *     newLink -> src            UNTRACKED, made after the commit
 *     README.md, ignored.log, .gitignore
 *   outside/{secret.txt, sub/x.txt}
 *   other/README.md             a second project, its own repository
 *   locked/l.txt                the folder linkLocked names, made 0300 last
 *   gone/g.txt                  the folder linkGone names; R3 removes it
 *   <home>/{.ssh/id_standin, dev/}   a stand-in home, by default <dir>/home;
 *                                    the probe passes one under its scratch HOME
 *
 * ## The exports
 *
 *   makeLinkFixture(dir, { home })   makes all of it and answers a descriptor:
 *                                    `{ root, proj, outside, other, home,
 *                                    locked, gone, pipe, links }`, `links`
 *                                    being every link in the project as
 *                                    `{ rel, target }` in the order made
 *   removeLinkFixture(fx)            puts `locked` back to 0700 and removes the
 *                                    tree and a stand-in home outside it
 *   linkStatOf(abs)                  the probe's OWN reading of one link, by
 *                                    `lstat` then `stat`: 'dir', 'file',
 *                                    'other' or 'none' (the re-derivation L2
 *                                    grades the drawn rows against)
 *   censusOf(root, { skip })         every entry under `root` by `lstat`,
 *                                    never followed: a file's sha256, a link's
 *                                    target text, a folder's entry names, an
 *                                    unreadable folder's modified time; `.git`
 *                                    is left out, because the app's own
 *                                    `git status` refreshes the index
 *   censusDiff(before, after)        the paths whose reading moved
 *
 *   node build/p343/fixture.mjs --self-test   makes one under the scratchpad
 *                                              of the caller's choosing
 *                                              (P343_FIXTURE_DIR, required),
 *                                              reads it back and removes it
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const J = JSON.stringify;

/** The environment every git call gets: no system config, no global config, a scratch HOME. */
export function gitEnv(gitHome) {
  return {
    PATH: process.env['PATH'] ?? '/usr/bin:/bin:/usr/sbin:/sbin',
    HOME: gitHome,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_TERMINAL_PROMPT: '0',
    LC_ALL: 'C'
  };
}

function git(cwd, gitHome, args) {
  const r = spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', ...args], {
    cwd,
    env: gitEnv(gitHome),
    encoding: 'utf8',
    timeout: 60_000
  });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} in ${cwd} exited ${String(r.status)}: ${String(r.stderr ?? '').trim().slice(0, 300)}`);
  return r.stdout;
}

const put = (path, text) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, 'utf8');
};

/**
 * Make the fixture. `dir` must not exist; `home` (absolute) is the stand-in
 * home the two home links name, made here with `.ssh/id_standin` and `dev/`.
 */
export function makeLinkFixture(dir, { home } = {}) {
  if (typeof dir !== 'string' || !isAbsolute(dir)) throw new Error(`the fixture folder ${J(dir)} is not absolute`);
  if (existsSync(dir)) throw new Error(`the fixture folder ${dir} already exists; it is made fresh every time`);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const root = realpathSync(dir);
  const P = join(root, 'proj');
  const outside = join(root, 'outside');
  const other = join(root, 'other');
  const locked = join(root, 'locked');
  const gone = join(root, 'gone');
  const standIn = home === undefined ? join(root, 'home') : resolve(home);
  if (!isAbsolute(standIn)) throw new Error(`the stand-in home ${J(home)} is not absolute`);
  const gitHome = join(root, '.p343-git-home');
  mkdirSync(gitHome, { mode: 0o700 });

  // ---- the make-fixture.sh tree, with the attack's additions -----------------
  for (const d of [join(P, 'src'), join(P, '.agent/skills/a-skill'), join(P, 'node_modules/pkg'), join(outside, 'sub'), join(standIn, 'dev'), join(standIn, '.ssh'), other, join(P, '.claude')]) {
    mkdirSync(d, { recursive: true });
  }
  put(join(P, 'README.md'), 'hello\n');
  put(join(P, 'src/index.ts'), 'export {}\n');
  put(join(P, '.agent/skills/a-skill/SKILL.md'), '# a skill\n');
  put(join(P, '.agent/skills/notes.md'), 'notes\n');
  put(join(P, 'node_modules/pkg/index.js'), 'x\n');
  put(join(P, 'ignored.log'), 'log\n');
  put(join(P, '.gitignore'), 'node_modules/\n*.log\n.venv\n/bazel-*\n');
  put(join(outside, 'secret.txt'), 'secret\n');
  put(join(outside, 'sub/x.txt'), 'x\n');
  put(join(standIn, '.ssh/id_standin'), 'not a key, a stand-in\n');
  put(join(other, 'README.md'), 'other\n');
  // The attack's additions (A3 to A8): a pnpm package, a /var/root link, a
  // 0300 folder, a target that goes away, a FIFO; R0's deep folder; R4's ten.
  put(join(P, 'node_modules/.pnpm/pkgb/b.js'), 'b\n');
  put(join(locked, 'l.txt'), 'locked\n');
  put(join(gone, 'g.txt'), 'gone\n');
  put(join(P, 'deep/a/b/c/d.txt'), 'deep\n');
  for (let i = 0; i < 10; i += 1) put(join(P, `tenTargets/t${String(i)}/f.txt`), `t${String(i)}\n`);
  mkdirSync(join(P, 'ten'));

  /** @type {{ rel: string, target: string }[]} */
  const links = [];
  const link = (rel, target) => {
    symlinkSync(target, join(P, rel));
    links.push({ rel, target });
  };
  const homeRel = relative(P, standIn) || '.';
  // The entry's nineteen, in make-fixture.sh's order.
  link('.claude/skills', '../.agent/skills');
  link('linkIn', 'src');
  link('linkInAbs', join(P, 'src'));
  link('linkOut', '../outside');
  link('linkOutAbs', outside);
  link('linkFile', 'src/index.ts');
  link('linkFileOut', '../outside/secret.txt');
  link('dangling', 'nothing-here');
  link('self', 'self');
  link('loopRoot', '.');
  link('up', '..');
  link('linkFsRoot', '/');
  link('linkHome', homeRel);
  link('linkSsh', join(homeRel, '.ssh'));
  link('linkDotGit', '.git');
  link('linkOther', '../other');
  link('chainA', 'chainB');
  link('chainB', '.agent/skills');
  link('src/linkIgnored', '../node_modules/pkg');
  // The attack's.
  link('.venv', '../outside');
  link('bazel-out', '../outside/sub');
  link('node_modules/pkgb', '.pnpm/pkgb');
  link('linkVarRoot', '/var/root');
  link('linkLocked', '../locked');
  link('linkGone', '../gone');
  link('linkPipe', 'pipe');
  for (let i = 0; i < 10; i += 1) link(`ten/l${String(i)}`, `../tenTargets/t${String(i)}`);

  // ---- the commits ----------------------------------------------------------
  git(P, gitHome, ['init', '-q', '-b', 'main', '.']);
  git(P, gitHome, ['add', '-A']);
  git(P, gitHome, ['commit', '-q', '-m', 'init']);
  git(other, gitHome, ['init', '-q', '-b', 'main', '.']);
  git(other, gitHome, ['add', '-A']);
  git(other, gitHome, ['commit', '-q', '-m', 'init']);

  // ---- after the commit: the untracked link, the FIFO, the locked folder ----
  link('newLink', 'src');
  const pipe = join(P, 'pipe');
  const fifo = spawnSync('/usr/bin/mkfifo', [pipe], { encoding: 'utf8', timeout: 10_000 });
  if (fifo.status !== 0) throw new Error(`mkfifo ${pipe} exited ${String(fifo.status)}: ${String(fifo.stderr ?? '').trim()}`);
  chmodSync(locked, 0o300);
  rmSync(gitHome, { recursive: true, force: true });

  return { root, proj: P, outside, other, home: standIn, locked, gone, pipe, links };
}

/** Put the 0300 folder back so it can be removed, then remove the tree (and a stand-in home outside it). */
export function removeLinkFixture(fx) {
  if (fx === null || fx === undefined) return;
  try {
    if (existsSync(fx.locked)) chmodSync(fx.locked, 0o700);
  } catch {
    /* removed below or already gone */
  }
  rmSync(fx.root, { recursive: true, force: true });
  if (typeof fx.home === 'string' && !fx.home.startsWith(`${fx.root}/`)) rmSync(fx.home, { recursive: true, force: true });
}

/**
 * The probe's own reading of one link: what `stat` (which follows) says it
 * points at, after `lstat` says it is a link. Mirrors build/p343/SPEC.md D2's
 * four answers and nothing of main's: 'dir', 'file', 'other' or 'none', and
 * null when the path is not a link at all.
 */
export function linkStatOf(abs) {
  let l;
  try {
    l = lstatSync(abs);
  } catch {
    return null;
  }
  if (!l.isSymbolicLink()) return null;
  try {
    const s = statSync(abs);
    if (s.isDirectory()) return 'dir';
    if (s.isFile()) return 'file';
    return 'other';
  } catch {
    return 'none';
  }
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

/**
 * Every entry under `root`, by `lstat`, never followed. Keys are paths relative
 * to `root` (a folder's with a trailing slash); values are `file <sha256>`,
 * `link <target>`, `dir <names>`, `dir unreadable <mtimeMs>`, `fifo` or the
 * kind. `.git` is skipped by name at any depth, and so is every name in `skip`.
 */
export function censusOf(root, { skip = [] } = {}) {
  const out = {};
  const walk = (abs, rel) => {
    let names;
    try {
      names = readdirSync(abs).sort();
    } catch {
      let mt = 'unknown';
      try {
        mt = String(lstatSync(abs).mtimeMs);
      } catch {
        /* gone */
      }
      out[rel === '' ? './' : `${rel}/`] = `dir unreadable ${mt}`;
      return;
    }
    out[rel === '' ? './' : `${rel}/`] = `dir ${names.filter((n) => n !== '.git').join('|')}`;
    for (const name of names) {
      if (name === '.git' || skip.includes(name)) continue;
      const childAbs = join(abs, name);
      const childRel = rel === '' ? name : `${rel}/${name}`;
      let st;
      try {
        st = lstatSync(childAbs);
      } catch {
        out[childRel] = 'vanished';
        continue;
      }
      if (st.isSymbolicLink()) out[childRel] = `link ${readlinkSync(childAbs)}`;
      else if (st.isDirectory()) walk(childAbs, childRel);
      else if (st.isFile()) {
        try {
          out[childRel] = `file ${sha(readFileSync(childAbs))}`;
        } catch {
          out[childRel] = `file unreadable ${String(st.size)}`;
        }
      } else if (st.isFIFO()) out[childRel] = 'fifo';
      else out[childRel] = 'other';
    }
  };
  walk(root, '');
  return out;
}

/** The census keys whose reading differs between two censuses, sorted. */
export function censusDiff(before, after) {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  return [...keys].filter((k) => (before ?? {})[k] !== (after ?? {})[k]).sort();
}

// ---------------------------------------------------------------------------
// --self-test: make one, read it, remove it. Starts git and mkfifo only.
// ---------------------------------------------------------------------------

function selfTest() {
  const base = (process.env['P343_FIXTURE_DIR'] ?? '').trim();
  if (base === '' || !isAbsolute(base)) {
    process.stderr.write('[p343-fixture] P343_FIXTURE_DIR must name an absolute scratch folder to make the fixture under.\n');
    return 2;
  }
  const dir = join(base, `fx-${String(process.pid)}`);
  let fx = null;
  const problems = [];
  try {
    fx = makeLinkFixture(dir, { home: join(base, `standin-${String(process.pid)}`) });
    const stats = Object.fromEntries(fx.links.map((l) => [l.rel, linkStatOf(join(fx.proj, l.rel))]));
    const want = {
      '.claude/skills': 'dir', linkIn: 'dir', linkInAbs: 'dir', linkOut: 'dir', linkOutAbs: 'dir', linkFile: 'file',
      linkFileOut: 'file', dangling: 'none', self: 'none', loopRoot: 'dir', up: 'dir', linkFsRoot: 'dir', linkHome: 'dir',
      linkSsh: 'dir', linkDotGit: 'dir', linkOther: 'dir', chainA: 'dir', chainB: 'dir', 'src/linkIgnored': 'dir', '.venv': 'dir',
      'bazel-out': 'dir', 'node_modules/pkgb': 'dir', linkVarRoot: 'dir', linkLocked: 'dir', linkGone: 'dir', linkPipe: 'other', newLink: 'dir'
    };
    for (const [rel, kind] of Object.entries(want)) if (stats[rel] !== kind) problems.push(`${rel} reads ${J(stats[rel])}, want ${kind}`);
    if (fx.links.length !== 37) problems.push(`${String(fx.links.length)} links, want 37 (19 + 7 + 10 + newLink)`);
    if ((lstatSync(fx.locked).mode & 0o777) !== 0o300) problems.push('locked is not 0300');
    if (!lstatSync(fx.pipe).isFIFO()) problems.push('pipe is not a FIFO');
    const status = spawnSync('git', ['status', '--porcelain'], { cwd: fx.proj, env: gitEnv(join(base, 'nohome')), encoding: 'utf8' }).stdout;
    if (status.trim() !== '?? newLink') problems.push(`git status reads ${J(status)}, want only ?? newLink`);
    const ignored = spawnSync('git', ['check-ignore', '-z', '--stdin'], { cwd: fx.proj, env: gitEnv(join(base, 'nohome')), input: ['node_modules/', 'ignored.log', '.venv', 'bazel-out', 'src/index.ts'].join('\0') + '\0', encoding: 'utf8' }).stdout.split('\0').filter(Boolean);
    if (J(ignored.sort()) !== J(['.venv', 'bazel-out', 'ignored.log', 'node_modules/'])) problems.push(`check-ignore answered ${J(ignored)}`);
    const c1 = censusOf(fx.root);
    const c2 = censusOf(fx.root);
    if (censusDiff(c1, c2).length !== 0) problems.push('two censuses of an untouched tree differ');
    if (c1['proj/.claude/skills'] !== 'link ../.agent/skills') problems.push(`the census reads the issue's link as ${J(c1['proj/.claude/skills'])}`);
    if (!String(c1['locked/'] ?? '').startsWith('dir unreadable')) problems.push(`the census reads locked/ as ${J(c1['locked/'])}`);
    writeFileSync(join(fx.outside, 'secret.txt'), 'moved\n');
    if (J(censusDiff(c1, censusOf(fx.root))) !== J(['outside/secret.txt'])) problems.push('a changed file is not the one path the census names');
  } catch (err) {
    problems.push(`threw: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    removeLinkFixture(fx);
    rmSync(join(base, 'nohome'), { recursive: true, force: true });
  }
  if (existsSync(dir)) problems.push(`${dir} was not removed`);
  for (const p of problems) process.stdout.write(`[p343-fixture] BAD ${p}\n`);
  process.stdout.write(problems.length === 0 ? '[p343-fixture] self-test PASS: 37 links, each read as its stat says, the census stable and exact, everything removed.\n' : `[p343-fixture] self-test FAIL, ${String(problems.length)}\n`);
  return problems.length === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv.includes('--self-test')) {
  process.exit(selfTest());
}
