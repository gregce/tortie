/**
 * Phase 336 — the far side's folder check, RUN rather than read.
 *
 * Every test here runs the SHIPPING script texts out of the catalogue under
 * `/bin/sh` AND `/bin/dash` over scratch trees in one scratch directory, and
 * reads the marker line that comes back and the bytes left on disk. They spawn
 * no ssh, contact no machine, run no tmux and touch nothing outside the
 * scratch directory, which is removed in `afterAll`. Every shell runs with a
 * scratch `HOME` and `ZDOTDIR`, `HISTFILE=/dev/null`, a fixed `PATH`, and no
 * `TERM_SESSION_ID` (the environment is built from nothing, never copied).
 *
 * WHY BOTH SHELLS, AND WHY THEY MUST AGREE (build/p336/SPEC.md §Attack G1).
 * The macOS `/bin/sh` is bash 3.2 and Debian's is dash. A first draft compared
 * the folder against the home by PATH TEXT, and bash kept the spelling it was
 * handed where dash returned the stored one, so a home typed in another case
 * passed under one and was refused under the other. The shipped check
 * compares device and inode, and every row below is asserted to answer the
 * same word under both shells.
 *
 * WHY THE RACE ROW EXISTS (§Attack G2, M9). A check through `"$1"` and a write
 * through `"$1"` are two resolutions, and a link swapped in between them took
 * the write. The shipped texts enter the folder once with `cd -P` and write
 * through `.`. The race row holds the script inside its checksum probe, which
 * runs after the folder check and before the write, swaps the folder for a
 * link to a victim folder, and reads the victim back: it must be unchanged.
 */

import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { remoteScript, REMOTE_SCRIPTS } from '../remote-scripts';

const SHELLS = ['/bin/sh', '/bin/dash'].filter((shell) => existsSync(shell));
const HAS_DASH = existsSync('/bin/dash');
const HAS_SHASUM = existsSync('/usr/bin/shasum');
const FOLDER_BOUND = [
  'file-put',
  'dir-new',
  'entry-rename',
  'git-stage',
  'git-unstage',
  'git-commit'
] as const;

let scratch = '';
let zdot = '';

beforeAll(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'p336-far-')));
  zdot = join(scratch, 'zdot');
  mkdirSync(zdot);
});

afterAll(() => {
  if (scratch.length > 0) rmSync(scratch, { recursive: true, force: true });
});

/** The environment every shell runs under, built from nothing. */
function envFor(home: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    PATH: '/usr/bin:/bin',
    HOME: home,
    ZDOTDIR: zdot,
    HISTFILE: '/dev/null',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CONFIG_SYSTEM: '/dev/null',
    GIT_AUTHOR_NAME: 'Tortie Test',
    GIT_AUTHOR_EMAIL: 'test@example.invalid',
    GIT_COMMITTER_NAME: 'Tortie Test',
    GIT_COMMITTER_EMAIL: 'test@example.invalid',
    ...extra
  };
}

/** Run one shipping script, answering what was between the markers. */
function run(
  shell: string,
  id: string,
  args: readonly string[],
  home: string,
  extra: Record<string, string> = {}
): string {
  const text = remoteScript(id)?.text ?? '';
  expect(text.length).toBeGreaterThan(0);
  const out = execFileSync(shell, ['-c', text, `tortie-${id}`, ...args], {
    encoding: 'utf8',
    env: envFor(home, extra)
  });
  const found = /__TORTIE_RUN__(.*?)__TORTIE_RUN__/s.exec(out);
  return found === null ? `<no answer: ${out.slice(0, 80)}>` : found[1] ?? '';
}

/** The first word of an answer. */
function word(answer: string): string {
  return answer.trim().split(/\s+/)[0] ?? '';
}

/** One folder's pin, through the shipping `folder-pin` READ. */
function pinOf(shell: string, folder: string, home: string): string {
  return run(shell, 'folder-pin', [folder], home).trim();
}

function md5(path: string): string {
  return createHash('md5').update(readFileSync(path)).digest('hex');
}

const PAYLOAD = Buffer.from('hello from tortie', 'utf8').toString('base64');

/**
 * Run one shipping text that a stand-in program holds inside its window (it
 * makes `mark` and waits for `go`), make `swap` happen inside that window,
 * then let it go. Answers what it printed; requires exit 0. The child is
 * killed in a `finally` whatever happened. The two race arms below share it.
 */
async function runHeldThenSwap(
  shell: string,
  args: readonly string[],
  env: NodeJS.ProcessEnv,
  mark: string,
  go: string,
  swap: () => void
): Promise<string> {
  const child = spawn(shell, [...args], { env });
  let out = '';
  child.stdout.on('data', (chunk: Buffer) => {
    out += chunk.toString('utf8');
  });
  const done = new Promise<number>((resolve) => {
    child.on('close', (code) => resolve(code ?? -1));
  });
  try {
    const started = Date.now();
    while (!existsSync(mark)) {
      if (Date.now() - started > 10_000) throw new Error('the script was never held');
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    swap();
    writeFileSync(go, '');
    expect(await done).toBe(0);
  } finally {
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  return out;
}

/** A fresh tree: a home with a child, a grandchild project and a .ssh. */
function tree(name: string): {
  root: string;
  home: string;
  child: string;
  project: string;
  ssh: string;
  victim: string;
} {
  const root = join(scratch, name);
  const home = join(root, 'home');
  const child = join(home, 'child');
  const project = join(home, 'code', 'proj');
  const ssh = join(home, '.ssh');
  const victim = join(root, 'victim');
  for (const dir of [child, project, ssh, victim]) mkdirSync(dir, { recursive: true });
  chmodSync(ssh, 0o700);
  writeFileSync(join(ssh, 'authorized_keys'), 'ssh-ed25519 AAAA keep\n');
  writeFileSync(join(victim, 'keep.txt'), 'the victim\n');
  return { root, home, child, project, ssh, victim };
}

/** True when this volume answers a name in another case as the same entry. */
function foldsCase(dir: string): boolean {
  const probe = join(dir, 'CaseProbe');
  writeFileSync(probe, '');
  const folds = existsSync(join(dir, 'caseprobe'));
  rmSync(probe, { force: true });
  return folds;
}

// ---------------------------------------------------------------------------
// The rows, per shell, and the two shells must agree
// ---------------------------------------------------------------------------

describe('the shipped folder check answers the same word under both shells', () => {
  it('runs on a machine that has dash, or says so', () => {
    // Not a skip: the row below compares the two shells, and a machine with no
    // dash compares one shell with itself. This Mac has both.
    expect(SHELLS).toContain('/bin/sh');
    if (!HAS_DASH) console.warn('p336-far-prelude: /bin/dash is absent here');
  });

  it('writes in the pinned folder, a home grandchild and a linked ancestor', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`write-${shell.replace(/\//g, '')}`);
      const row: string[] = [];
      // The pinned folder, two levels below the home.
      const pin = pinOf(shell, t.project, t.home);
      expect(pin).toMatch(/^[0-9]+:[0-9]+$/);
      row.push(word(run(shell, 'file-put', [t.project, 'a.txt', 'new', PAYLOAD, pin], t.home)));
      expect(readFileSync(join(t.project, 'a.txt'), 'utf8')).toBe('hello from tortie');
      // A folder under a LINKED ANCESTOR keeps one identity however it is
      // spelled, and keeps saving (SPEC §9 arm B).
      const real = join(t.root, 'real-above', 'repo');
      mkdirSync(real, { recursive: true });
      symlinkSync(join(t.root, 'real-above'), join(t.root, 'link-above'));
      const viaLink = join(t.root, 'link-above', 'repo');
      const linkPin = pinOf(shell, viaLink, t.home);
      expect(linkPin).toBe(pinOf(shell, real, t.home));
      row.push(word(run(shell, 'file-put', [viaLink, 'b.txt', 'new', PAYLOAD, linkPin], t.home)));
      row.push(word(run(shell, 'dir-new', [viaLink, 'made', linkPin], t.home)));
      expect(existsSync(join(real, 'b.txt'))).toBe(true);
      expect(existsSync(join(real, 'made'))).toBe(true);
      answers.push(row);
    }
    for (const row of answers) expect(row).toEqual(['wrote', 'wrote', 'made']);
  });

  it('refuses a home, a home ancestor and /, each by identity', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`home-${shell.replace(/\//g, '')}`);
      const row: string[] = [];
      const at = (folder: string): string =>
        word(
          run(
            shell,
            'file-put',
            [folder, 'x.txt', 'new', PAYLOAD, pinOf(shell, folder, t.home)],
            t.home
          )
        );
      row.push(at(t.home));
      row.push(at(t.root));
      row.push(at('/'));
      // A folder that is a LINK to the home is judged as the folder it leads to.
      const toHome = join(t.root, 'innocent-home');
      symlinkSync(t.home, toHome);
      row.push(at(toHome));
      // A link NAMED LIKE A PROJECT (`dev`) that leads to the home is still the
      // home, after Phase 336.1 made the home's own `dev` a folder Tortie
      // writes in.
      const devLink = join(t.root, 'dev');
      symlinkSync(t.home, devLink);
      row.push(at(devLink));
      // The home typed in ANOTHER CASE, which a path text rule passed under
      // bash and refused under dash (§Attack G1).
      row.push(foldsCase(t.root) ? at(join(t.root, 'HOME')) : 'offlimits');
      // A folder directly under / that HOLDS the home (the scratch home is
      // under /private on this Mac) is a holder, whatever its depth.
      row.push(t.home.startsWith('/private/') ? at('/private') : 'offlimits');
      for (const folder of [t.home, t.root]) {
        expect(existsSync(join(folder, 'x.txt'))).toBe(false);
      }
      answers.push(row);
    }
    for (const row of answers) expect(row).toEqual(Array(7).fill('offlimits'));
  });

  // Phase 336.1, his ruling of 5 October 2026 ("Yes, fix it now"): only the
  // home itself, a folder holding it, and / stay off limits. Phase 336 also
  // refused the home's direct children, which greyed out his ~/dev.
  it('writes in a folder directly inside the home, in any spelling, and directly under /', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const s = shell.replace(/\//g, '');
      const t = tree(`homechild-${s}`);
      const dev = join(t.home, 'dev');
      mkdirSync(dev);
      const row: string[] = [];
      const pin = pinOf(shell, dev, t.home);
      row.push(word(run(shell, 'file-put', [dev, 'a.txt', 'new', PAYLOAD, pin], t.home)));
      row.push(word(run(shell, 'dir-new', [dev, 'made', pin], t.home)));
      writeFileSync(join(dev, 'r.txt'), 'r\n');
      row.push(word(run(shell, 'entry-rename', [dev, 'r.txt', 'r2.txt', pin], t.home)));
      expect(readFileSync(join(dev, 'a.txt'), 'utf8')).toBe('hello from tortie');
      expect(existsSync(join(dev, 'made'))).toBe(true);
      expect(existsSync(join(dev, 'r2.txt'))).toBe(true);
      // The home's other direct child, typed in another case.
      if (foldsCase(t.root)) {
        const upper = join(t.root, 'HOME', 'CHILD');
        row.push(
          word(run(shell, 'file-put', [upper, 'u.txt', 'new', PAYLOAD, pinOf(shell, upper, t.home)], t.home))
        );
        expect(existsSync(join(t.child, 'u.txt'))).toBe(true);
      } else {
        row.push('wrote');
      }
      // A folder directly under / that does not hold the home. The only one
      // this account can write below is /private, so the home is / here and
      // the write lands inside this test's own scratch directory, reached
      // THROUGH /private: the folder check is judged on /private itself.
      if (scratch.startsWith('/private/')) {
        const rel = `${scratch.slice('/private/'.length)}/rootchild-${s}.txt`;
        const rootChild = word(
          run(shell, 'file-put', ['/private', rel, 'new', PAYLOAD, pinOf(shell, '/private', '/')], '/')
        );
        row.push(rootChild);
        expect(existsSync(join(scratch, `rootchild-${s}.txt`))).toBe(rootChild === 'wrote');
      } else {
        row.push('wrote');
      }
      answers.push(row);
    }
    for (const row of answers) expect(row).toEqual(['wrote', 'made', 'moved', 'wrote', 'wrote']);
  });

  it('refuses a .ssh or .git folder by identity, in every spelling the volume folds', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`reserved-${shell.replace(/\//g, '')}`);
      const before = md5(join(t.ssh, 'authorized_keys'));
      const repo = join(t.root, 'repo');
      mkdirSync(join(repo, '.git', 'hooks'), { recursive: true });
      writeFileSync(join(repo, '.git', 'config'), '[core]\n');
      const gitBefore = md5(join(repo, '.git', 'config'));
      const row: string[] = [];
      const at = (folder: string): string =>
        word(
          run(
            shell,
            'file-put',
            [folder, 'k', 'new', PAYLOAD, pinOf(shell, folder, t.home)],
            t.home
          )
        );
      row.push(at(t.ssh));
      row.push(at(join(repo, '.git')));
      row.push(at(join(repo, '.git', 'hooks')));
      // A folder whose NAME hides a link into .ssh (research 138 GhostApproval).
      const innocent = join(t.root, 'innocent');
      symlinkSync(t.ssh, innocent);
      row.push(at(innocent));
      // The home's .ssh is a direct child of the home, which Phase 336.1 made
      // writable in general; it stays refused by identity, typed in another
      // case too, and through a link named like a project.
      row.push(foldsCase(t.root) ? at(join(t.home, '.SSH')) : 'protected');
      const devLink = join(t.root, 'dev');
      symlinkSync(t.ssh, devLink);
      row.push(at(devLink));
      // The Unicode folds an APFS volume makes (§Attack M5): sharp s and long s.
      if (existsSync(join(t.home, '.ßh'))) {
        row.push(at(join(t.home, '.ßh')));
        row.push(at(join(t.home, '.ſsh')));
      } else {
        row.push('protected', 'protected');
      }
      expect(md5(join(t.ssh, 'authorized_keys'))).toBe(before);
      expect(existsSync(join(t.ssh, 'k'))).toBe(false);
      expect(md5(join(repo, '.git', 'config'))).toBe(gitBefore);
      answers.push(row);
    }
    for (const row of answers) expect(row).toEqual(Array(8).fill('protected'));
  });

  it('refuses a folder swapped for a link, or for a new folder, after its pin was read', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`swap-${shell.replace(/\//g, '')}`);
      const victimBefore = md5(join(t.victim, 'keep.txt'));
      const row: string[] = [];
      // Swapped for a link to somewhere else.
      const pin = pinOf(shell, t.project, t.home);
      renameSync(t.project, `${t.project}.away`);
      symlinkSync(t.victim, t.project);
      row.push(word(run(shell, 'file-put', [t.project, 'keep.txt', 'new', PAYLOAD, pin], t.home)));
      row.push(word(run(shell, 'dir-new', [t.project, 'made', pin], t.home)));
      expect(md5(join(t.victim, 'keep.txt'))).toBe(victimBefore);
      expect(existsSync(join(t.victim, 'made'))).toBe(false);
      // Swapped for a NEW real folder at the same path, which is a new inode.
      rmSync(t.project);
      mkdirSync(t.project);
      row.push(word(run(shell, 'file-put', [t.project, 'n.txt', 'new', PAYLOAD, pin], t.home)));
      expect(existsSync(join(t.project, 'n.txt'))).toBe(false);
      // Put back, it answers again: the identity is the folder, not the path.
      rmSync(t.project, { recursive: true });
      renameSync(`${t.project}.away`, t.project);
      row.push(word(run(shell, 'file-put', [t.project, 'back.txt', 'new', PAYLOAD, pin], t.home)));
      answers.push(row);
    }
    for (const row of answers) {
      expect(row).toEqual(['notsame', 'notsame', 'notsame', 'wrote']);
    }
  });

  it('answers nohome for an empty, a relative or an unreadable home', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`nohome-${shell.replace(/\//g, '')}`);
      const pin = pinOf(shell, t.project, t.home);
      const row: string[] = [];
      for (const home of ['', 'relative/home', join(t.root, 'no-such-home')]) {
        row.push(word(run(shell, 'file-put', [t.project, 'h.txt', 'new', PAYLOAD, pin], home)));
      }
      expect(existsSync(join(t.project, 'h.txt'))).toBe(false);
      answers.push(row);
    }
    for (const row of answers) expect(row).toEqual(['nohome', 'nohome', 'nohome']);
  });

  it('answers badname for a relative folder and for a name holding two dots', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`badname-${shell.replace(/\//g, '')}`);
      const pin = pinOf(shell, t.project, t.home);
      answers.push([
        word(run(shell, 'file-put', ['relative/proj', 'a.txt', 'new', PAYLOAD, pin], t.home)),
        word(run(shell, 'file-put', [t.project, 'a..b.md', 'new', PAYLOAD, pin], t.home)),
        word(run(shell, 'dir-new', [t.project, '/abs', pin], t.home)),
        word(run(shell, 'entry-rename', [t.project, 'a', 'b/../c', pin], t.home))
      ]);
    }
    for (const row of answers) {
      expect(row).toEqual(['badname', 'badname', 'badname', 'badname']);
    }
  });

  it('refuses a .git or .ssh relative path in any ASCII case, file-put included', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`relguard-${shell.replace(/\//g, '')}`);
      mkdirSync(join(t.project, '.git'));
      writeFileSync(join(t.project, '.git', 'config'), '[core]\n');
      const before = md5(join(t.project, '.git', 'config'));
      const pin = pinOf(shell, t.project, t.home);
      answers.push([
        word(run(shell, 'file-put', [t.project, '.GIT/config', 'new', PAYLOAD, pin], t.home)),
        word(run(shell, 'file-put', [t.project, 'src/.Ssh/x', 'new', PAYLOAD, pin], t.home)),
        word(run(shell, 'dir-new', [t.project, '.gIT/x', pin], t.home)),
        word(run(shell, 'entry-rename', [t.project, 'a', '.SSH/a', pin], t.home)),
        // The bracket class does not over-match.
        word(run(shell, 'dir-new', [t.project, '.github', pin], t.home))
      ]);
      expect(md5(join(t.project, '.git', 'config'))).toBe(before);
    }
    for (const row of answers) {
      expect(row).toEqual(['protected', 'protected', 'protected', 'protected', 'made']);
    }
  });

  it('skips the folder check for a legacy root (pin -), so a root at the home still writes', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`legacy-${shell.replace(/\//g, '')}`);
      answers.push([
        word(run(shell, 'file-put', [t.home, 'legacy.txt', 'new', PAYLOAD, '-'], t.home)),
        word(run(shell, 'dir-new', [t.home, 'legacy-dir', '-'], t.home)),
        // The 242 family below the root still refuses a link.
        (() => {
          symlinkSync(t.victim, join(t.home, 'escape'));
          return word(
            run(shell, 'file-put', [t.home, 'escape/keep.txt', 'new', PAYLOAD, '-'], t.home)
          );
        })(),
        // A legacy root that is not there answers the word that verb already
        // printed for a folder that is not there.
        word(run(shell, 'dir-new', [join(t.root, 'gone'), 'x', '-'], t.home)),
        word(run(shell, 'entry-rename', [join(t.root, 'gone'), 'a', 'b', '-'], t.home))
      ]);
      expect(readFileSync(join(t.home, 'legacy.txt'), 'utf8')).toBe('hello from tortie');
      expect(readFileSync(join(t.victim, 'keep.txt'), 'utf8')).toBe('the victim\n');
    }
    for (const row of answers) {
      expect(row).toEqual(['wrote', 'made', 'outside', 'noparent', 'gone']);
    }
  });

  it('still refuses a link BELOW a pinned folder, which is the 242 family', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`below-${shell.replace(/\//g, '')}`);
      symlinkSync(t.victim, join(t.project, 'escape'));
      execFileSync('git', ['init', '-q', t.project], { env: envFor(t.home) });
      const pin = pinOf(shell, t.project, t.home);
      answers.push([
        word(run(shell, 'file-put', [t.project, 'escape/x.txt', 'new', PAYLOAD, pin], t.home)),
        word(run(shell, 'dir-new', [t.project, 'escape/made', pin], t.home)),
        word(
          run(
            shell,
            'git-stage',
            [realpathSync(t.project), 'x', t.project, 'escape', pin],
            t.home
          )
        )
      ]);
      expect(existsSync(join(t.victim, 'x.txt'))).toBe(false);
      expect(existsSync(join(t.victim, 'made'))).toBe(false);
    }
    for (const row of answers) expect(row).toEqual(['outside', 'outside', 'outside']);
  });

  it('pins a folder the way the check reads it, so the two agree', () => {
    for (const shell of SHELLS) {
      const t = tree(`agree-${shell.replace(/\//g, '')}`);
      const pin = pinOf(shell, t.project, t.home);
      // `stat` over "$1/." by this process, in the spelling this machine has.
      const spelled = execFileSync(
        '/bin/sh',
        ['-c', "stat -c '%d:%i' \"$1/.\" 2>/dev/null || stat -f '%d:%i' \"$1/.\"", 'x', t.project],
        { encoding: 'utf8', env: envFor(t.home) }
      ).trim();
      expect(pin).toBe(spelled);
      expect(pinOf(shell, 'relative', t.home)).toBe('none');
      expect(pinOf(shell, join(t.root, 'absent'), t.home)).toBe('none');
    }
  });
});

// ---------------------------------------------------------------------------
// The three verbs that take a cwd
// ---------------------------------------------------------------------------

describe('the git verbs reach the repository from the folder they checked', () => {
  function repo(at: string, home: string): void {
    mkdirSync(at, { recursive: true });
    execFileSync('git', ['init', '-q', at], { env: envFor(home) });
  }

  function staged(at: string, home: string): string {
    return execFileSync('git', ['-C', at, 'diff', '--cached', '--name-only'], {
      encoding: 'utf8',
      env: envFor(home)
    }).trim();
  }

  it('stages, unstages and commits in the pinned folder and in a repository above it', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`git-${shell.replace(/\//g, '')}`);
      const top = join(t.root, 'work', 'api');
      repo(top, t.home);
      const sub = join(top, 'src');
      mkdirSync(sub);
      writeFileSync(join(sub, 'a.ts'), 'one\n');
      const physTop = realpathSync(top);
      const pinTop = pinOf(shell, top, t.home);
      const pinSub = pinOf(shell, sub, t.home);
      const row: string[] = [];
      // The folder IS the repository root.
      row.push(word(run(shell, 'git-stage', [physTop, 'src/a.ts', top, '', pinTop], t.home)));
      expect(staged(top, t.home)).toBe('src/a.ts');
      row.push(word(run(shell, 'git-unstage', [physTop, 'src/a.ts', top, '', pinTop], t.home)));
      expect(staged(top, t.home)).toBe('');
      // The folder sits BELOW the repository root (the `~/code/api/src` person).
      row.push(word(run(shell, 'git-stage', [physTop, 'src/a.ts', sub, '', pinSub], t.home)));
      expect(staged(top, t.home)).toBe('src/a.ts');
      row.push(
        word(run(shell, 'git-commit', [physTop, 'none', 'first', sub, '', pinSub], t.home))
      );
      answers.push(row);
    }
    for (const row of answers) expect(row).toEqual(['0', '0', '0', 'committed']);
  });

  it('answers notsame for a root that is not above the folder, and stages nothing', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`gitroot-${shell.replace(/\//g, '')}`);
      const mine = join(t.root, 'mine');
      const other = join(t.root, 'other');
      repo(mine, t.home);
      repo(other, t.home);
      writeFileSync(join(mine, 'a.ts'), 'mine\n');
      writeFileSync(join(other, 'a.ts'), 'other\n');
      const pin = pinOf(shell, mine, t.home);
      answers.push([
        word(run(shell, 'git-stage', [realpathSync(other), 'a.ts', mine, '', pin], t.home)),
        word(
          run(shell, 'git-commit', [realpathSync(other), 'none', 'x', mine, '', pin], t.home)
        )
      ]);
      expect(staged(other, t.home)).toBe('');
      expect(staged(mine, t.home)).toBe('');
    }
    for (const row of answers) expect(row).toEqual(['notsame', 'notsame']);
  });

  it('answers notsame when the folder was swapped for a link to another repository', () => {
    const answers: string[] = [];
    for (const shell of SHELLS) {
      const t = tree(`gitswap-${shell.replace(/\//g, '')}`);
      const mine = join(t.root, 'mine');
      const victim = join(t.root, 'victim-repo');
      repo(mine, t.home);
      repo(victim, t.home);
      writeFileSync(join(victim, 'a.ts'), 'victim\n');
      const pin = pinOf(shell, mine, t.home);
      const physMine = realpathSync(mine);
      renameSync(mine, `${mine}.away`);
      symlinkSync(victim, mine);
      answers.push(word(run(shell, 'git-stage', [physMine, 'a.ts', mine, '', pin], t.home)));
      expect(staged(victim, t.home)).toBe('');
    }
    for (const one of answers) expect(one).toBe('notsame');
  });

  it('answers badname for an empty list and protected for a reserved cwd', () => {
    const answers: string[][] = [];
    for (const shell of SHELLS) {
      const t = tree(`gitguard-${shell.replace(/\//g, '')}`);
      const top = join(t.root, 'r');
      repo(top, t.home);
      const pin = pinOf(shell, top, t.home);
      const phys = realpathSync(top);
      answers.push([
        word(run(shell, 'git-stage', [phys, '', top, '', pin], t.home)),
        word(run(shell, 'git-stage', [phys, 'a', top, '.GIT', pin], t.home)),
        word(run(shell, 'git-stage', [phys, '.Git/config', top, '', pin], t.home)),
        word(run(shell, 'git-commit', [phys, 'none', 'm', top, '.git', pin], t.home))
      ]);
    }
    for (const row of answers) {
      expect(row).toEqual(['badname', 'protected', 'protected', 'protected']);
    }
  });
});

// ---------------------------------------------------------------------------
// The swap INSIDE the window between the check and the write (§Attack M9)
// ---------------------------------------------------------------------------

describe('a link swapped in after the check and before the write takes nothing', () => {
  it.skipIf(!HAS_SHASUM)(
    'writes into the folder that was checked, never into the victim',
    async () => {
      for (const shell of SHELLS) {
        const t = tree(`race-${shell.replace(/\//g, '')}`);
        const victimBefore = md5(join(t.victim, 'keep.txt'));
        const pin = pinOf(shell, t.project, t.home);
        // A `shasum` that holds the script inside its checksum probe, which runs
        // after the folder check and the link walk and before the write.
        const bin = join(t.root, 'bin');
        mkdirSync(bin);
        const mark = join(t.root, 'held');
        const go = join(t.root, 'go');
        writeFileSync(
          join(bin, 'shasum'),
          [
            '#!/bin/sh',
            `if [ ! -e '${mark}' ]; then`,
            `  : > '${mark}'`,
            `  while [ ! -e '${go}' ]; do sleep 0.05; done`,
            'fi',
            'exec /usr/bin/shasum "$@"'
          ].join('\n') + '\n'
        );
        chmodSync(join(bin, 'shasum'), 0o755);
        const text = remoteScript('file-put')?.text ?? '';
        const out = await runHeldThenSwap(
          shell,
          ['-c', text, 'tortie-file-put', t.project, 'landed.txt', 'new', PAYLOAD, pin],
          { ...envFor(t.home), PATH: `${bin}:/usr/bin:/bin` },
          mark,
          go,
          () => {
            // The swap, inside the window.
            renameSync(t.project, `${t.project}.away`);
            symlinkSync(t.victim, t.project);
          }
        );
        expect(word(/__TORTIE_RUN__(.*?)__TORTIE_RUN__/s.exec(out)?.[1] ?? '')).toBe('wrote');
        // The victim is untouched and the bytes landed in the folder that was
        // checked, which now sits at the name it was moved to. A write through
        // "$1" would have resolved the swapped name and landed in the victim.
        expect(md5(join(t.victim, 'keep.txt'))).toBe(victimBefore);
        expect(existsSync(join(t.victim, 'landed.txt'))).toBe(false);
        expect(readFileSync(join(`${t.project}.away`, 'landed.txt'), 'utf8')).toBe(
          'hello from tortie'
        );
      }
    },
    30_000
  );
});

describe('a repository swapped for a link after its root was identified takes nothing', () => {
  it.skipIf(!existsSync('/usr/bin/stat'))(
    'stages in the repository the climb found, never in the one the name now names',
    async () => {
      for (const shell of SHELLS) {
        const t = tree(`gitrace-${shell.replace(/\//g, '')}`);
        const repo = join(t.root, 'repo');
        const victim = join(t.root, 'victim-repo');
        for (const at of [repo, victim]) {
          mkdirSync(at, { recursive: true });
          execFileSync('git', ['init', '-q', at], { env: envFor(t.home) });
          writeFileSync(join(at, 'a.ts'), `${at}\n`);
        }
        const physRepo = realpathSync(repo);
        const pin = pinOf(shell, repo, t.home);
        // A `stat` that holds the script once it has read the ROOT's identity,
        // which `repoAnchor` does after the folder check and before it enters
        // the root, so the root's name can be swapped inside that window.
        const bin = join(t.root, 'bin');
        mkdirSync(bin);
        const mark = join(t.root, 'held');
        const go = join(t.root, 'go');
        writeFileSync(
          join(bin, 'stat'),
          [
            '#!/bin/sh',
            'out=$(/usr/bin/stat "$@" 2>/dev/null); rc=$?',
            'for last in "$@"; do :; done',
            `if [ "$last" = '${physRepo}/.' ] && [ ! -e '${mark}' ]; then`,
            `  : > '${mark}'`,
            `  while [ ! -e '${go}' ]; do sleep 0.05; done`,
            'fi',
            'if [ -n "$out" ]; then printf \'%s\\n\' "$out"; fi',
            'exit $rc'
          ].join('\n') + '\n'
        );
        chmodSync(join(bin, 'stat'), 0o755);
        const text = remoteScript('git-stage')?.text ?? '';
        const out = await runHeldThenSwap(
          shell,
          ['-c', text, 'tortie-git-stage', physRepo, 'a.ts', repo, '', pin],
          { ...envFor(t.home), PATH: `${bin}:/usr/bin:/bin` },
          mark,
          go,
          () => {
            renameSync(repo, `${repo}.away`);
            symlinkSync(victim, repo);
          }
        );
        expect(word(/__TORTIE_RUN__(.*?)__TORTIE_RUN__/s.exec(out)?.[1] ?? '')).toBe('0');
        const stagedIn = (at: string): string =>
          execFileSync('git', ['-C', at, 'diff', '--cached', '--name-only'], {
            encoding: 'utf8',
            env: envFor(t.home)
          }).trim();
        expect(stagedIn(victim)).toBe('');
        expect(stagedIn(`${repo}.away`)).toBe('a.ts');
      }
    },
    30_000
  );
});

// ---------------------------------------------------------------------------
// The text, read
// ---------------------------------------------------------------------------

describe('the six folder-bound texts', () => {
  it('name no exit 1, so every refusal is a word inside the markers', () => {
    for (const id of FOLDER_BOUND) {
      expect(remoteScript(id)?.text ?? '').not.toMatch(/\bexit 1\b/);
    }
  });

  it('carry the pin last and the folder check above the link walk and every write', () => {
    for (const id of FOLDER_BOUND) {
      const script = remoteScript(id);
      const text = script?.text ?? '';
      expect(script?.bound).toBe('folder');
      const pinVar = `"$${String(script?.params ?? 0)}"`;
      expect(text).toContain(`if [ ${pinVar} = - ]; then`);
      expect(text).toContain(`[ "$wx" != ${pinVar} ]`);
      const checkAt = text.indexOf('cd -P -- ');
      expect(checkAt).toBeGreaterThan(0);
      expect(checkAt).toBeLessThan(text.indexOf('lr="'));
      for (const writer of ['mv ', 'mkdir ', '> "$t"', 'git add', 'git restore', 'git commit']) {
        const at = text.indexOf(writer);
        if (at >= 0) expect(at).toBeGreaterThan(checkAt);
      }
    }
  });

  it('write through the anchored folder and never re-read the folder positional after the check', () => {
    for (const id of FOLDER_BOUND) {
      const script = remoteScript(id);
      const text = script?.text ?? '';
      const folderVar = `$${String((script?.folderArg ?? 0) + 1)}`;
      const lines = text.split('\n');
      const lastCheck = lines.findLastIndex((line) => line.includes(`"${folderVar}"`));
      const firstCd = lines.findIndex((line) => line.includes('cd -P -- '));
      // The folder positional is named in the check and nowhere below it.
      expect(lastCheck).toBeGreaterThanOrEqual(0);
      expect(lines[lastCheck]).toContain('cd -P -- ');
      expect(lastCheck).toBeGreaterThanOrEqual(firstCd);
    }
    expect(remoteScript('file-put')?.text).toContain('f="./$2"');
    expect(remoteScript('dir-new')?.text).toContain('d="./$2"');
    expect(remoteScript('entry-rename')?.text).toContain('s="./$2"');
    expect(remoteScript('entry-rename')?.text).toContain('t="./$3"');
    for (const id of ['git-stage', 'git-unstage', 'git-commit']) {
      const text = remoteScript(id)?.text ?? '';
      expect(text).not.toMatch(/^cd "\$[0-9r]"$/m);
    }
  });

  it('folder-pin is one value, GNU stat first, through the folder', () => {
    const text = remoteScript('folder-pin')?.text ?? '';
    expect(remoteScript('folder-pin')?.mode).toBe('read');
    expect(remoteScript('folder-pin')?.params).toBe(1);
    const gnu = text.indexOf(`i=$(stat -c '%d:%i' "$d/."`);
    const bsd = text.indexOf(`i=$(stat -f '%d:%i' "$d/."`);
    expect(gnu).toBeGreaterThan(0);
    expect(bsd).toBeGreaterThan(gnu);
    expect(text.indexOf(`q=$(stat -c '%d:%i' /`)).toBeLessThan(gnu);
    expect(text.match(/__TORTIE_RUN__/g)?.length).toBe(4);
  });

  it('compare identities rather than path text', () => {
    for (const id of FOLDER_BOUND) {
      const text = remoteScript(id)?.text ?? '';
      expect(text).not.toContain('pwd -P');
      expect(text).toContain(`"$HOME/."`);
      expect(text).toContain(`"$wd/../.git/."`);
      expect(text).toContain(`"$wd/../.ssh/."`);
    }
  });

  it('holds exactly six folder-bound writes and two machine-bound ones', () => {
    const writes = REMOTE_SCRIPTS.filter((script) => script.mode === 'write');
    expect(writes.filter((one) => one.bound === 'folder').map((one) => one.id)).toEqual([
      ...FOLDER_BOUND
    ]);
    expect(writes.filter((one) => one.bound === 'machine').map((one) => one.id)).toEqual([
      'image-put',
      'git-clone'
    ]);
    for (const read of REMOTE_SCRIPTS.filter((script) => script.mode === 'read')) {
      expect(read.bound).toBeUndefined();
      expect(read.folderArg).toBeUndefined();
    }
  });
});
