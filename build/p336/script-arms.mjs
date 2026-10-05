#!/usr/bin/env node
/**
 * `npm run probe:p336:script`. Phase 336's far half, run alone: the SHIPPING
 * texts of the six folder-bound writes and of `folder-pin`, handed to
 * `/bin/sh` AND `/bin/dash` over scratch trees on this Mac, with main
 * BYPASSED (build/p336/SPEC.md §8.3).
 *
 * ## Why the far half is run alone
 *
 * Main is the complete gate for a reserved name and the never-list's text
 * half, because every Tortie write goes through it. What main CANNOT see is
 * the far machine: a home folder there, a link there, a folder swapped there
 * after it was opened. That is the far prelude's whole job (D5, D9), and a
 * test that goes through main proves main. So every arm here composes the
 * positionals itself, exactly as `runFolderWrite` would (D8: the pin LAST),
 * and asks the far text alone.
 *
 * ## Why two shells, and why they must agree
 *
 * The adversary round measured the draft's path-text prelude answering `pass`
 * under the macOS `/bin/sh` (bash 3.2, which keeps the spelling `cd -P` was
 * handed) where `/bin/dash` answered `offlimits` for the same folder typed in
 * another case (§Attack G1, M6, M7). Debian's `/bin/sh` is dash. A far rule
 * that one shell keeps and the other does not is not a rule, so EVERY row runs
 * under both and a row the two answer differently fails, whatever either
 * answered.
 *
 * ## What it runs
 *
 *   M8   the adversary's 29 prelude shapes (§Attack M8, re-run by this
 *        builder against the adversary's own text and taken as the expected
 *        table), each through ALL SIX scripts' real answers, with the far bytes
 *        read back after a refusal: no file, no folder, no rename and no
 *        index change where a refusal stood.
 *   H1   a folder swapped for a link after a good save: every verb `notsame`,
 *        the victim unchanged; then a re-pin (the hand open) saves.
 *   H2   swapped for a new real folder at the same path: `notsame`, nothing
 *        written in either.
 *   H3   a folder opened at a link into the scratch home's `.ssh`, and one at
 *        `.ßh` (the sharp-s spelling APFS folds to `.ssh`): `protected` BY
 *        IDENTITY, nothing in `.ssh`.
 *   H4   reserved names in the RELATIVE path, main bypassed: the ASCII case
 *        variants `protected` by the far bracket backstop with the real
 *        `.git/config` and the hooks listing unchanged; the Unicode folds
 *        PRINTED as the stated residual (D10: main refuses them on every
 *        product path; with main bypassed the far rel backstop is ASCII).
 *   H8   projects at the scratch home and a child of it `offlimits`, a
 *        grandchild writes.
 *   M9   the check-to-write window: a link swapped in between a `folder-pin`
 *        read and the write answers `notsame` for all six verbs; and a link
 *        swapped in INSIDE one `file-put` call, after its prelude and before
 *        its write (a `shasum` stand-in on PATH holds the window open for a
 *        second), leaves the victim unchanged and the payload in the folder
 *        that was checked (§Attack G2: the anchored `.`).
 *   L    the 242 family with pin `-` (a legacy write root): every link arm
 *        answers today's `outside`, the hard link at the staged name writes
 *        with the file outside unchanged, a plain save writes, and a legacy
 *        root AT the scratch home still writes (D16).
 *   P    `folder-pin` itself: its pair equals node's own `st_dev:st_ino` for
 *        the folder, it reads through a linked ancestor to the real folder,
 *        and it answers `none` for a missing or relative folder.
 *   CS   with `P336_CASE_VOLUME=1`, on a case-sensitive APFS image made with
 *        `hdiutil` (no sudo), detached and deleted in a `finally`
 *        (build/p274/case-sensitive-image.mjs): a `.ssh` and a `.git` FOLDER
 *        are still refused there BY IDENTITY, and a `.GIT` relative name is
 *        refused by the ASCII backstop although `.GIT` and `.git` are two
 *        folders on that volume (the backstop's accepted cost, local's own).
 *
 * ## What it starts, and what it touches
 *
 * `/bin/sh`, `/bin/dash`, `git` and `shasum` under them, each with
 * `spawnSync` or one awaited `spawn` that is waited for, and `hdiutil` only
 * with `P336_CASE_VOLUME=1`. No Electron, no ssh, no tmux, no agent, no token.
 * Every shell runs with an environment built from nothing: `PATH`, a scratch
 * `HOME` (the row's own far home), a scratch `ZDOTDIR` and `HISTFILE=/dev/null`,
 * and no `TERM_SESSION_ID`. Every tree is under one `mkdtemp` in
 * `/private/tmp`, removed in a `finally` and on SIGINT, SIGTERM and SIGHUP.
 * Nothing under the person's home is named.
 *
 * Exit 0 on PASS, 1 on any failed row, 2 when it cannot run at all (no
 * `/bin/dash`, or the catalogue would not load), with a sentence saying which.
 * `P336_SCRIPT_REPORT=<path>` writes every row as JSON for a verifier.
 */

import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { tsxCli } from '../ts-runner.mjs';
import { withCaseSensitiveImage } from '../p274/case-sensitive-image.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TAG = '[p336-script]';
const say = (line) => process.stdout.write(`${TAG} ${line}\n`);

/** The two shells every row runs under. */
export const SHELLS = ['/bin/sh', '/bin/dash'];

/** The six folder-bound writes (D8, D13), in catalogue order. */
export const FOLDER_BOUND = ['file-put', 'dir-new', 'entry-rename', 'git-stage', 'git-unstage', 'git-commit'];

/**
 * D8's table: each script's positional count after this phase and the 1-based
 * positional the folder rides in. The pin is ALWAYS the last positional.
 */
export const LAYOUT = {
  'file-put': { params: 5, folder: 1 },
  'dir-new': { params: 3, folder: 1 },
  'entry-rename': { params: 4, folder: 1 },
  'git-stage': { params: 5, folder: 3 },
  'git-unstage': { params: 5, folder: 3 },
  'git-commit': { params: 6, folder: 4 }
};

/** The words the prelude may answer (D5, D9, D12), none of which means anything was written. */
export const PRELUDE_WORDS = ['notsame', 'offlimits', 'protected', 'nohome', 'badname'];

/** Each script's word for a write that went through. */
export const DONE_WORD = {
  'file-put': 'wrote',
  'dir-new': 'made',
  'entry-rename': 'moved',
  'git-stage': '0',
  'git-unstage': '0',
  'git-commit': 'committed'
};

/** The words a git verb may answer once the prelude passed, whatever git then decided. */
const GIT_PASS = {
  'git-stage': ['0', '1'],
  'git-unstage': ['0', '1'],
  'git-commit': ['committed', 'failed', 'moved']
};

/**
 * The `conformance:machines` condition that owns one row (build/p336/SPEC.md
 * §8.1): 115 the folder's identity, 116 the never-list, 117 the reserved names.
 * The gate drives these arms and files each failure under its owner, so an
 * ablation of one clause reddens the condition that owns it.
 */
export function conditionOf(group, label) {
  if (group === 'm8') {
    const n = String(label).split(' ')[0];
    if (/^(?:5|6|6b|11|11b)$/.test(n)) return 117;
    if (/^(?:2|3|3b|4|7|8|9|9b|9c|9d|9e|9f|13)$/.test(n)) return 116;
    return 115;
  }
  if (group === 'h3' || group === 'h4' || group === 'cs') return 117;
  if (group === 'h8') return 116;
  if (group === 'legacy' && /far home/.test(String(label))) return 116;
  return 115;
}

/** The owner of one problem line this file printed: its group, then its quoted label. */
export function ownerOfProblem(text) {
  const group = /^([a-z0-9]+)\b/.exec(String(text))?.[1] ?? '';
  const label = /"([^"]+)"/.exec(String(text))?.[1] ?? String(text);
  return conditionOf(group, label);
}

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');

/** `st_dev:st_ino` of a path's folder, read the way `stat -f '%d:%i' "$1/."` reads it, or `none`. */
export function identityOf(path) {
  try {
    const s = statSync(`${path}/.`, { bigint: true });
    return `${s.dev.toString()}:${s.ino.toString()}`;
  } catch {
    return 'none';
  }
}

/** The shipping texts, through build/p336/far-texts.mts under the pinned tsx. */
export function loadFarTexts(cwd = REPO) {
  const r = spawnSync(process.execPath, [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/p336/far-texts.mts'], {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024
  });
  const line = String(r.stdout ?? '')
    .trimEnd()
    .split('\n')
    .filter((l) => l.startsWith('{"id":"p336-far-texts"'))
    .pop();
  if (r.status !== 0 || line === undefined) {
    return { loadError: `far-texts.mts exited ${String(r.status)}: ${String(r.stderr ?? '').trim().split('\n')[0] ?? ''}`, scripts: [] };
  }
  return JSON.parse(line);
}

/** What one text printed, read the way `parseRemoteScriptAnswer` reads it: the first marker pair. */
export function answerOf(stdout, marker = '__TORTIE_RUN__') {
  const at = stdout.indexOf(marker);
  if (at < 0) return { word: null, fields: [] };
  const end = stdout.indexOf(marker, at + marker.length);
  if (end < 0) return { word: null, fields: [] };
  const inner = stdout.slice(at + marker.length, end);
  if (inner === '') return { word: null, fields: [] };
  const fields = inner.split(' ');
  return { word: fields[0] ?? null, fields };
}

/**
 * A far runner over a set of texts. `env` is built from nothing on every call:
 * PATH, the row's far HOME (omitted when `home` is undefined, which is the
 * "HOME unset" row), a scratch ZDOTDIR and HISTFILE=/dev/null. No
 * TERM_SESSION_ID, because nothing is inherited.
 */
export function farRunner({ texts, scratch, path = '/usr/bin:/bin:/usr/sbin:/sbin' }) {
  const byId = new Map((texts.scripts ?? []).map((row) => [row.id, row]));
  const zdot = join(scratch, 'zdot');
  mkdirSync(zdot, { recursive: true, mode: 0o700 });
  const envFor = (home, extra = {}) => {
    const env = { PATH: path, ZDOTDIR: zdot, HISTFILE: '/dev/null', LC_ALL: 'C', ...extra };
    if (home !== undefined) env.HOME = home;
    return env;
  };
  const argvFor = (shell, id, args) => {
    const row = byId.get(id);
    if (row === undefined) throw new Error(`the catalogue holds no ${id}`);
    return [shell, ['-c', row.text, `tortie-${id}`, ...args]];
  };
  return {
    has: (id) => byId.has(id),
    row: (id) => byId.get(id),
    /** Run one text, synchronously. */
    run(shell, id, args, { home, cwd = scratch, extraEnv = {} } = {}) {
      const [file, argv] = argvFor(shell, id, args);
      const r = spawnSync(file, argv, { cwd, env: envFor(home, extraEnv), encoding: 'utf8', timeout: 60_000 });
      const answer = answerOf(String(r.stdout ?? ''), texts.marker ?? '__TORTIE_RUN__');
      return { ...answer, status: r.status, stderr: String(r.stderr ?? '').slice(0, 400), stdout: String(r.stdout ?? '').slice(0, 400) };
    },
    /** Run one text and hand back its child, for the in-window race; the caller awaits `done`. */
    start(shell, id, args, { home, cwd = scratch, extraEnv = {} } = {}) {
      const [file, argv] = argvFor(shell, id, args);
      const child = spawn(file, argv, { cwd, env: envFor(home, extraEnv), stdio: ['ignore', 'pipe', 'pipe'] });
      let stdout = '';
      let stderr = '';
      child.stdout.on('data', (d) => (stdout += String(d)));
      child.stderr.on('data', (d) => (stderr += String(d)));
      const done = new Promise((resolveDone) => {
        child.on('close', (status) => {
          resolveDone({ ...answerOf(stdout, texts.marker ?? '__TORTIE_RUN__'), status, stderr: stderr.slice(0, 400) });
        });
      });
      return { child, done };
    },
    /** The shipping `folder-pin` read of one folder: its pair, or `none`. */
    pin(shell, folder, { home } = {}) {
      return this.run(shell, 'folder-pin', [folder], { home }).word ?? 'none';
    }
  };
}

/**
 * The argument list main would compose for one verb, the pin LAST (D8). `o`
 * names what the verb needs; anything missing takes a harmless default.
 */
export function argsFor(id, o) {
  switch (id) {
    case 'file-put':
      return [o.folder, o.rel ?? 'p336.txt', o.expect ?? 'new', o.payload ?? b64('p336\n'), o.pin];
    case 'dir-new':
      return [o.folder, o.rel ?? 'p336-dir', o.pin];
    case 'entry-rename':
      return [o.folder, o.from ?? 'p336-src.txt', o.to ?? 'p336-dst.txt', o.pin];
    case 'git-stage':
    case 'git-unstage':
      return [o.repo, o.list ?? 'a.txt', o.folder, o.cwd ?? '', o.pin];
    case 'git-commit':
      return [o.repo, o.sha ?? 'none', o.message ?? 'p336', o.folder, o.cwd ?? '', o.pin];
    default:
      throw new Error(`no argument shape for ${id}`);
  }
}

const git = (cwd, args, home) =>
  spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    env: { PATH: '/usr/bin:/bin', HOME: home, HISTFILE: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' }
  });

/** A scratch repository with one commit and a local identity, so no global config is read or written. */
export function makeRepo(dir, home) {
  mkdirSync(dir, { recursive: true });
  git(dir, ['init', '-q'], home);
  git(dir, ['config', '--local', 'user.name', 'p336'], home);
  git(dir, ['config', '--local', 'user.email', 'p336@example.invalid'], home);
  writeFileSync(join(dir, 'a.txt'), 'a\n');
  writeFileSync(join(dir, 'README.md'), '# p336\n');
  git(dir, ['add', '-A'], home);
  git(dir, ['commit', '-q', '-m', 'p336 base'], home);
  return dir;
}

const headOf = (repo, home) => String(git(repo, ['rev-parse', 'HEAD'], home).stdout ?? '').trim();
const fileSha = (path) => (existsSync(path) ? sha256(readFileSync(path)) : 'absent');
const listing = (dir) => {
  try {
    return readdirSync(dir).sort().join(',');
  } catch {
    return 'absent';
  }
};

/**
 * Every arm, run under every shell. `only` names groups to run (all when
 * empty): `pin`, `m8`, `h1`, `h2`, `h3`, `h4`, `h8`, `m9`, `legacy`, `cs`.
 * `m8Scripts` narrows the M8 shapes to some of the six (the gate runs two;
 * every other group always runs all six).
 * Answers `{ rows, problems, residual }`; each row carries `group`, `label`,
 * `script`, the two shells' words and the verdict.
 */
export async function runArms({ texts, only = [], caseVolume = false, windowSeconds = 1, m8Scripts = FOLDER_BOUND } = {}) {
  const want = (g) => only.length === 0 || only.includes(g);
  const problems = [];
  const rows = [];
  const residual = [];
  const missing = ['folder-pin', ...FOLDER_BOUND].filter((id) => !(texts.scripts ?? []).some((r) => r.id === id));
  if (missing.length > 0) {
    problems.push(`the catalogue has no ${missing.join(', ')}, so the far half cannot be driven`);
    return { rows, problems, residual };
  }
  for (const id of FOLDER_BOUND) {
    const row = texts.scripts.find((r) => r.id === id);
    const lay = LAYOUT[id];
    if (row.params !== lay.params || (row.folderPositional !== null && row.folderPositional !== lay.folder)) {
      problems.push(
        `${id} declares ${String(row.params)} positional(s) with the folder at $${String(row.folderPositional)}; D8 says ` +
          `${String(lay.params)} with the folder at $${String(lay.folder)} and the pin last, which is the shape every arm composes`
      );
    }
  }
  if (problems.length > 0) return { rows, problems, residual };

  const scratch = mkdtempSync(join('/private/tmp', `p336-script-${String(process.pid)}-`));
  const removeScratch = () => rmSync(scratch, { recursive: true, force: true });
  const onSignal = () => {
    removeScratch();
    process.exit(130);
  };
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, onSignal);
  const far = farRunner({ texts, scratch });
  /** A row: every shell's answer, compared with the expected word set and with each other. */
  const record = (group, label, script, answers, expect, extra = {}) => {
    const words = answers.map((a) => a.word ?? '(no answer)');
    const agree = words.every((w) => w === words[0]);
    const ok = agree && expect.includes(words[0]) && (extra.farOk ?? true);
    rows.push({ group, label, script, words: Object.fromEntries(SHELLS.map((s, i) => [s, words[i]])), expect, ok, ...extra });
    if (!agree) {
      problems.push(`${group} "${label}" ${script}: the shells disagree, ${SHELLS.map((s, i) => `${s} ${words[i]}`).join(', ')} (§Attack G1: a far rule one shell keeps and the other does not is not a rule)`);
    } else if (!expect.includes(words[0])) {
      problems.push(`${group} "${label}" ${script}: answered ${words[0]} under both shells, expected ${expect.join(' or ')}${answers[0].stderr ? ` (stderr: ${answers[0].stderr.trim().split('\n')[0]})` : ''}`);
    } else if (extra.farOk === false) {
      problems.push(`${group} "${label}" ${script}: answered ${words[0]} but the far bytes do not say what the answer says: ${extra.farWhy ?? 'see the report'}`);
    }
    return ok;
  };

  /** The word every M8 shape that should write is graded against. */
  const PASS = 'pass';
  try {
    const T = scratch;
    const H = join(T, 'home');
    mkdirSync(join(H, '.ssh', 'keys'), { recursive: true });
    writeFileSync(join(H, '.ssh', 'authorized_keys'), 'p336 scratch, never a real key\n');
    mkdirSync(join(H, 'code', 'proj'), { recursive: true });
    mkdirSync(join(H, 'child', 'grand'), { recursive: true });
    const G = makeRepo(join(T, 'gitrepo'), H);
    const gIndex = () => fileSha(join(G, '.git', 'index'));
    const gHead = () => headOf(G, H);

    // ---------------------------------------------------------------- P
    if (want('pin')) {
      mkdirSync(join(T, 'realabove', 'repo'), { recursive: true });
      symlinkSync(join(T, 'realabove'), join(T, 'linkabove'));
      for (const [label, folder, expect] of [
        ['a folder', join(H, 'code', 'proj'), identityOf(join(H, 'code', 'proj'))],
        ['through a linked ancestor reads the real folder', join(T, 'linkabove', 'repo'), identityOf(join(T, 'realabove', 'repo'))],
        ['a missing folder', join(T, 'not-here'), 'none'],
        ['a relative folder', 'code/proj', 'none']
      ]) {
        const answers = SHELLS.map((sh) => ({ word: far.pin(sh, folder, { home: H }), stderr: '' }));
        record('pin', label, 'folder-pin', answers, [expect]);
      }
    }

    // ---------------------------------------------------------------- M8
    if (want('m8')) {
      const U = T.toUpperCase();
      if (!existsSync(join(T, 'realabove'))) {
        mkdirSync(join(T, 'realabove', 'repo'), { recursive: true });
        symlinkSync(join(T, 'realabove'), join(T, 'linkabove'));
      }
      mkdirSync(join(T, 'repo', '.git', 'hooks'), { recursive: true });
      mkdirSync(join(T, 'victim'), { recursive: true });
      writeFileSync(join(T, 'victim', 'f'), 'orig\n');
      mkdirSync(join(T, 'plain', 'sub'), { recursive: true });
      symlinkSync(join(H, '.ssh', 'keys'), join(T, 'innocent'));
      symlinkSync(join(H, '.ßh', 'keys'), join(T, 'inn2'));
      symlinkSync(H, join(T, 'linkhome'));
      mkdirSync(join(T, 'we[ab]* d'), { recursive: true });
      mkdirSync(join(T, 'nl\nx'), { recursive: true });
      /** [label, home, folder, pin, expected] — the adversary's table (§Attack M8), re-run by this builder. */
      const shapes = [
        ['1 pinned folder home/code/proj', H, join(H, 'code', 'proj'), identityOf(join(H, 'code', 'proj')), PASS],
        ['2 folder = HOME (typed upper case)', H, join(T, 'HOME'), identityOf(join(T, 'HOME')), 'offlimits'],
        ['3 HOME child, upper case', H, join(T, 'HOME', 'CHILD'), identityOf(join(T, 'HOME', 'CHILD')), 'offlimits'],
        ['3b HOME grandchild, upper case', H, join(T, 'HOME', 'CHILD', 'GRAND'), identityOf(join(T, 'HOME', 'CHILD', 'GRAND')), PASS],
        ['4 link to HOME', H, join(T, 'linkhome'), identityOf(join(T, 'linkhome')), 'offlimits'],
        ['5 link to HOME/.ssh/keys', H, join(T, 'innocent'), identityOf(join(T, 'innocent')), 'protected'],
        ['6 link text .ßh/keys', H, join(T, 'inn2'), identityOf(join(T, 'inn2')), 'protected'],
        ['6b folder typed .ſsh/keys', H, join(H, '.ſsh', 'keys'), identityOf(join(H, '.ſsh', 'keys')), 'protected'],
        ['7 ancestor of HOME, upper case', H, U, identityOf(U), 'offlimits'],
        ['8 /', H, '/', identityOf('/'), 'offlimits'],
        ['9 HOME empty', '', join(H, 'code', 'proj'), identityOf(join(H, 'code', 'proj')), 'nohome'],
        ['9b HOME relative', 'home', join(H, 'code', 'proj'), identityOf(join(H, 'code', 'proj')), 'nohome'],
        ['9c HOME missing', join(T, 'nohere'), join(H, 'code', 'proj'), identityOf(join(H, 'code', 'proj')), 'nohome'],
        ['9f HOME unset', undefined, join(H, 'code', 'proj'), identityOf(join(H, 'code', 'proj')), 'nohome'],
        ['9d HOME=/, folder /private', '/', '/private', identityOf('/private'), 'offlimits'],
        ['9e HOME=/, folder deep', '/', join(H, 'code', 'proj'), identityOf(join(H, 'code', 'proj')), PASS],
        ['10 linked ancestor', H, join(T, 'linkabove', 'repo'), identityOf(join(T, 'realabove', 'repo')), PASS],
        ['11 inside .GIT typed', H, join(T, 'repo', '.GIT', 'hooks'), identityOf(join(T, 'repo', '.git', 'hooks')), 'protected'],
        ['11b the .git itself', H, join(T, 'repo', '.git'), identityOf(join(T, 'repo', '.git')), 'protected'],
        ['12 glob and space name', H, join(T, 'we[ab]* d'), identityOf(join(T, 'we[ab]* d')), PASS],
        ['12b newline name', H, join(T, 'nl\nx'), identityOf(join(T, 'nl\nx')), PASS],
        ['13 legacy pin - at HOME', H, H, '-', PASS],
        ['15 relative folder', H, 'code/proj', '1:1', 'badname']
      ];
      for (const [label, home, folder, pin, expected] of shapes) {
        m8Row(label, home, folder, pin, expected);
      }
      // 14: one folder pinned, then swapped for a link, for a new folder, put back, deleted.
      const P = join(T, 'plain', 'sub');
      const pinP = identityOf(P);
      m8Row('14a plain, pinned', H, P, pinP, PASS);
      renameSync(P, `${P}.away`);
      symlinkSync(join(T, 'victim'), P);
      m8Row('14b swapped for a link', H, P, pinP, 'notsame');
      rmSync(P);
      mkdirSync(P);
      m8Row('14c swapped for a new folder', H, P, pinP, 'notsame');
      rmSync(P, { recursive: true });
      renameSync(`${P}.away`, P);
      m8Row('14d original back', H, P, pinP, PASS);
      rmSync(P, { recursive: true });
      m8Row('14e deleted', H, P, pinP, 'notsame');
      const victimAfter = fileSha(join(T, 'victim', 'f'));
      if (victimAfter !== sha256('orig\n') || listing(join(T, 'victim')) !== 'f') {
        problems.push(`m8: the victim folder a swapped folder named is not as it was (f ${victimAfter.slice(0, 12)}, listing ${listing(join(T, 'victim'))})`);
      }
    }

    /**
     * One M8 shape through all six scripts. A pass writes a uniquely named
     * entry inside the folder and is read back; a refusal leaves nothing.
     */
    function m8Row(label, home, folder, pin, expected) {
      const tag = label.split(' ')[0].replace(/[^0-9a-z]/gi, '');
      // A shape that should write is asked of the git verbs inside a
      // repository of its own, because since Phase 336 the far side checks
      // that the repository root main names is the one git finds from the tab's
      // folder (a different root answers notsame). The root handed over is
      // what that machine's own git prints for the folder, as main's is.
      let repo = G;
      if (expected === PASS && existsSync(folder) && !folder.startsWith('code/')) {
        const top = String(git(folder, ['rev-parse', '--show-toplevel'], H).stdout ?? '').replace(/\n$/, '');
        const own = identityOf(top) === identityOf(folder);
        if (!own) makeRepo(folder, H);
        repo = String(git(folder, ['rev-parse', '--show-toplevel'], H).stdout ?? '').replace(/\n$/, '');
      }
      for (const id of m8Scripts) {
        const answers = [];
        const far1 = [];
        for (const sh of SHELLS) {
          const s = sh.split('/').pop();
          const unique = `p336-${tag}-${id}-${s}`;
          const physical = (() => {
            try {
              return existsSync(folder) && !folder.startsWith('code/') ? folder : null;
            } catch {
              return null;
            }
          })();
          let before = null;
          // A source to rename only where the shape is a pass: in a refusal row
          // the folder may be a link to the victim, and a source planted there
          // would read as the victim moving.
          if (id === 'entry-rename' && physical !== null && expected === PASS) {
            try {
              writeFileSync(join(physical, `${unique}.src`), 'r\n');
            } catch {
              /* a folder Tortie may not write and neither may this harness, such as / */
            }
          }
          if (id.startsWith('git-')) before = { index: gIndex(), head: gHead() };
          const o = {
            folder,
            pin,
            rel: `${unique}.txt`,
            from: `${unique}.src`,
            to: `${unique}.dst`,
            repo,
            list: 'a.txt',
            sha: headOf(repo, H)
          };
          if (id === 'dir-new') o.rel = unique;
          const a = far.run(sh, id, argsFor(id, o), { home });
          answers.push(a);
          // The far bytes, read back.
          const refused = expected !== PASS;
          let ok = true;
          let why = '';
          if (physical !== null && !id.startsWith('git-')) {
            const made = id === 'file-put' ? existsSync(join(physical, `${unique}.txt`)) : id === 'dir-new' ? existsSync(join(physical, unique)) : existsSync(join(physical, `${unique}.dst`));
            if (refused && made) {
              ok = false;
              why = `${id} made ${unique} in ${folder} although it answered ${String(a.word)}`;
            }
            if (!refused && a.word === DONE_WORD[id] && !made) {
              ok = false;
              why = `${id} answered ${a.word} and nothing is in ${folder}`;
            }
          }
          if (id.startsWith('git-') && refused) {
            const after = { index: gIndex(), head: gHead() };
            if (after.index !== before.index || after.head !== before.head) {
              ok = false;
              why = `${id} refused and the repository's index or HEAD moved`;
            }
          }
          far1.push({ ok, why });
        }
        const expectWords = expected === PASS ? (id.startsWith('git-') ? GIT_PASS[id] : [DONE_WORD[id]]) : [expected];
        const farOk = far1.every((f) => f.ok);
        record('m8', label, id, answers, expectWords, { farOk, farWhy: far1.map((f) => f.why).filter(Boolean).join('; ') });
      }
    }

    // ---------------------------------------------------------------- H1, H2
    if (want('h1') || want('h2')) {
      for (const sh of SHELLS) {
        const s = sh.split('/').pop();
        const root = join(T, `h12-${s}`);
        const A = join(root, 'proj');
        mkdirSync(A, { recursive: true });
        const victim = join(root, 'victim-dir');
        mkdirSync(victim, { recursive: true });
        writeFileSync(join(victim, 'v.txt'), 'victim\n');
        const vBefore = { sha: fileSha(join(victim, 'v.txt')), list: listing(victim) };
        const pinA = far.pin(sh, A, { home: H });
        const good = far.run(sh, 'file-put', argsFor('file-put', { folder: A, pin: pinA, rel: 'good.txt' }), { home: H });
        rows.push({ group: 'h1', label: 'a good save before the swap', script: 'file-put', words: { [sh]: good.word }, ok: good.word === 'wrote' });
        if (good.word !== 'wrote') problems.push(`h1 ${s}: the save before the swap answered ${String(good.word)}, so the swap arms below read nothing`);
        if (want('h1')) {
          renameSync(A, `${A}.away`);
          symlinkSync(victim, A);
          for (const id of FOLDER_BOUND) {
            const a = far.run(sh, id, argsFor(id, { folder: A, pin: pinA, rel: `h1-${id}.txt`, from: 'v.txt', to: 'v2.txt', repo: G, sha: gHead() }), { home: H });
            const vNow = { sha: fileSha(join(victim, 'v.txt')), list: listing(victim) };
            const farOk = vNow.sha === vBefore.sha && vNow.list === vBefore.list;
            rows.push({ group: 'h1', label: `swapped for a link, ${s}`, script: id, words: { [sh]: a.word }, ok: a.word === 'notsame' && farOk });
            if (a.word !== 'notsame') problems.push(`h1 ${s} ${id}: a folder swapped for a link answered ${String(a.word)}, not notsame`);
            if (!farOk) problems.push(`h1 ${s} ${id}: the link's victim moved (listing ${vNow.list})`);
          }
          // The hand open: a fresh pin of the same path, which now names what the link names.
          const repin = far.pin(sh, A, { home: H });
          const again = far.run(sh, 'file-put', argsFor('file-put', { folder: A, pin: repin, rel: 'reopened.txt' }), { home: H });
          rows.push({ group: 'h1', label: `re-pinned by a hand open, ${s}`, script: 'file-put', words: { [sh]: again.word }, ok: again.word === 'wrote' });
          if (again.word !== 'wrote' || !existsSync(join(victim, 'reopened.txt'))) {
            problems.push(`h1 ${s}: after a re-pin (the hand open) the save answered ${String(again.word)}; it writes where the opened path now leads`);
          }
          rmSync(A);
          renameSync(`${A}.away`, A);
        }
        if (want('h2')) {
          renameSync(A, `${A}.moved`);
          mkdirSync(A);
          for (const id of FOLDER_BOUND) {
            const a = far.run(sh, id, argsFor(id, { folder: A, pin: pinA, rel: `h2-${id}.txt`, from: 'good.txt', to: 'h2.txt', repo: G, sha: gHead() }), { home: H });
            const wrote = listing(A) !== '' || listing(`${A}.moved`) !== 'good.txt';
            rows.push({ group: 'h2', label: `swapped for a new folder, ${s}`, script: id, words: { [sh]: a.word }, ok: a.word === 'notsame' && !wrote });
            if (a.word !== 'notsame') problems.push(`h2 ${s} ${id}: a new folder at the opened path answered ${String(a.word)}, not notsame`);
            if (wrote) problems.push(`h2 ${s} ${id}: something was written (new ${listing(A)}, old ${listing(`${A}.moved`)})`);
          }
        }
      }
    }

    // ---------------------------------------------------------------- H3
    if (want('h3')) {
      const sshBefore = listing(join(H, '.ssh'));
      for (const [label, link, target] of [
        ['opened at a link into .ssh', join(T, 'h3-innocent'), join(H, '.ssh')],
        ['opened at a link into .ßh (folds to .ssh)', join(T, 'h3-inn2'), join(H, '.ßh')]
      ]) {
        symlinkSync(target, link);
        const answers = SHELLS.map((sh) => {
          const pin = far.pin(sh, link, { home: H });
          return far.run(sh, 'file-put', argsFor('file-put', { folder: link, pin, rel: `h3-${sh.split('/').pop()}.txt` }), { home: H });
        });
        record('h3', label, 'file-put', answers, ['protected']);
        const answersDir = SHELLS.map((sh) => {
          const pin = far.pin(sh, link, { home: H });
          return far.run(sh, 'dir-new', argsFor('dir-new', { folder: link, pin, rel: `h3d-${sh.split('/').pop()}` }), { home: H });
        });
        record('h3', label, 'dir-new', answersDir, ['protected']);
      }
      if (listing(join(H, '.ssh')) !== sshBefore) problems.push(`h3: the scratch home's .ssh changed (${sshBefore} to ${listing(join(H, '.ssh'))})`);
    }

    // ---------------------------------------------------------------- H4
    if (want('h4')) {
      const R = makeRepo(join(T, 'h4-repo'), H);
      mkdirSync(join(R, '.git', 'hooks'), { recursive: true });
      mkdirSync(join(R, '.ssh'), { recursive: true });
      const cfg = join(R, '.git', 'config');
      const before = { cfg: fileSha(cfg), hooks: listing(join(R, '.git', 'hooks')), ssh: listing(join(R, '.ssh')), index: fileSha(join(R, '.git', 'index')) };
      const cfgSum = fileSha(cfg);
      const ascii = [
        ['file-put .GIT/config (replace)', 'file-put', { rel: '.GIT/config', expect: cfgSum }],
        ['file-put new .Git/hooks/pre-commit', 'file-put', { rel: '.Git/hooks/pre-commit' }],
        ['dir-new .gIT/x', 'dir-new', { rel: '.gIT/x' }],
        ['rename README.md into .SSH/', 'entry-rename', { from: 'README.md', to: '.SSH/README.md' }],
        ['stage with a cwd of .GIT', 'git-stage', { cwd: '.GIT', list: 'a.txt', repo: R }],
        ['unstage with a cwd of .Ssh', 'git-unstage', { cwd: '.Ssh', list: 'a.txt', repo: R }],
        ['commit with a cwd of .GiT', 'git-commit', { cwd: '.GiT', repo: R }],
        ['stage a path inside .GIT', 'git-stage', { list: '.GIT/index', repo: R }],
        ['rename out of .Git', 'entry-rename', { from: '.Git/config', to: 'cfg' }]
      ];
      for (const [label, id, o] of ascii) {
        const answers = SHELLS.map((sh) => {
          const pin = far.pin(sh, R, { home: H });
          return far.run(sh, id, argsFor(id, { folder: R, pin, sha: headOf(R, H), ...o }), { home: H });
        });
        record('h4', label, id, answers, ['protected']);
      }
      const after = { cfg: fileSha(cfg), hooks: listing(join(R, '.git', 'hooks')), ssh: listing(join(R, '.ssh')), index: fileSha(join(R, '.git', 'index')) };
      if (JSON.stringify(after) !== JSON.stringify(before)) {
        problems.push(`h4: the repository's .git/config, hooks, index or .ssh moved: ${JSON.stringify(before)} to ${JSON.stringify(after)}`);
      }
      // The stated residual (D10): a Unicode fold in the RELATIVE path, main bypassed.
      for (const [label, id, rel] of [
        ['file-put .ßh/x', 'file-put', '.ßh/x'],
        ['dir-new .ſsh/d', 'dir-new', '.ſsh/d']
      ]) {
        const words = SHELLS.map((sh) => {
          const pin = far.pin(sh, R, { home: H });
          const one = `${rel}-${sh.split('/').pop()}`;
          return far.run(sh, id, argsFor(id, { folder: R, pin, rel: one }), { home: H }).word ?? '(no answer)';
        });
        residual.push({ label, script: id, words: Object.fromEntries(SHELLS.map((s, i) => [s, words[i]])), sshNow: listing(join(R, '.ssh')) });
        if (words[0] !== words[1]) problems.push(`h4 residual "${label}": the shells disagree (${words.join(' / ')})`);
      }
    }

    // ---------------------------------------------------------------- H8
    if (want('h8')) {
      for (const [label, folder, expected] of [
        ['a project at the far home', H, 'offlimits'],
        ['a project directly inside it', join(H, 'child'), 'offlimits'],
        ['a project two below it', join(H, 'child', 'grand'), 'wrote']
      ]) {
        const answers = SHELLS.map((sh) => {
          const pin = far.pin(sh, folder, { home: H });
          return far.run(sh, 'file-put', argsFor('file-put', { folder, pin, rel: `h8-${sh.split('/').pop()}.txt` }), { home: H });
        });
        const wroteAny = SHELLS.some((sh) => existsSync(join(folder, `h8-${sh.split('/').pop()}.txt`)));
        record('h8', label, 'file-put', answers, [expected], { farOk: expected === 'wrote' ? wroteAny : !wroteAny, farWhy: 'the file is where the answer says it is not' });
      }
    }

    // ---------------------------------------------------------------- M9
    if (want('m9')) {
      // (a) a link swapped in between a folder-pin read and the write.
      for (const id of FOLDER_BOUND) {
        const answers = [];
        let farOk = true;
        for (const sh of SHELLS) {
          const s = sh.split('/').pop();
          const root = join(T, `m9a-${id}-${s}`);
          const A = join(root, 'proj');
          const victim = join(root, 'victim');
          mkdirSync(A, { recursive: true });
          mkdirSync(victim, { recursive: true });
          writeFileSync(join(victim, 'f'), 'orig\n');
          writeFileSync(join(A, 'f'), 'mine\n');
          const pin = far.pin(sh, A, { home: H });
          renameSync(A, `${A}.moved`);
          symlinkSync(victim, A);
          answers.push(far.run(sh, id, argsFor(id, { folder: A, pin, rel: 'f2.txt', from: 'f', to: 'g', repo: G, sha: gHead() }), { home: H }));
          if (fileSha(join(victim, 'f')) !== sha256('orig\n') || listing(victim) !== 'f') farOk = false;
        }
        record('m9', 'a link swapped in between the pin read and the write', id, answers, ['notsame'], { farOk, farWhy: 'the victim moved' });
      }
      // (b) the window INSIDE one file-put, held open by a shasum stand-in.
      const slow = join(T, 'slowbin');
      mkdirSync(slow, { recursive: true });
      writeFileSync(
        join(slow, 'shasum'),
        '#!/bin/sh\nif [ -f "$P336_GATE_FLAG" ]; then /bin/rm -f "$P336_GATE_FLAG"; : > "$P336_GATE_READY"; ' +
          `/bin/sleep ${String(windowSeconds)}; fi\nexec /usr/bin/shasum "$@"\n`
      );
      chmodSync(join(slow, 'shasum'), 0o755);
      const slowFar = farRunner({ texts, scratch, path: `${slow}:/usr/bin:/bin:/usr/sbin:/sbin` });
      const answers = [];
      let farOk = true;
      const whys = [];
      for (const sh of SHELLS) {
        const s = sh.split('/').pop();
        const root = join(T, `m9b-${s}`);
        const A = join(root, 'proj');
        const victim = join(root, 'victim');
        mkdirSync(A, { recursive: true });
        mkdirSync(victim, { recursive: true });
        writeFileSync(join(victim, 'f'), 'orig\n');
        const pin = identityOf(A);
        const flag = join(root, 'flag');
        const ready = join(root, 'ready');
        writeFileSync(flag, '');
        const run = slowFar.start(sh, 'file-put', argsFor('file-put', { folder: A, pin, rel: 'f', payload: b64('PAYLOAD') }), {
          home: H,
          extraEnv: { P336_GATE_FLAG: flag, P336_GATE_READY: ready }
        });
        let inWindow = false;
        let a;
        // The one child this file does not wait for synchronously, ended in a
        // finally whatever happened: a deadline kills it, and so does any
        // throw between its start and its answer.
        const deadline = setTimeout(() => run.child.kill('SIGKILL'), 30_000);
        try {
          const until = Date.now() + 10_000;
          while (!existsSync(ready) && Date.now() < until) await new Promise((r) => setTimeout(r, 20));
          inWindow = existsSync(ready);
          if (inWindow) {
            renameSync(A, `${A}.moved`);
            symlinkSync(victim, A);
          }
          a = await run.done;
        } finally {
          clearTimeout(deadline);
          if (run.child.exitCode === null && run.child.signalCode === null) run.child.kill('SIGKILL');
        }
        answers.push(a);
        const victimNow = readFileSync(join(victim, 'f'), 'utf8');
        const checked = existsSync(join(`${A}.moved`, 'f')) ? readFileSync(join(`${A}.moved`, 'f'), 'utf8') : 'absent';
        if (!inWindow) {
          farOk = false;
          whys.push(`${s}: the window never opened (no shasum call after the prelude?)`);
        } else if (victimNow !== 'orig\n') {
          farOk = false;
          whys.push(`${s}: the payload landed in the victim (ESCAPE): the write re-read the folder's path rather than the anchored .`);
        } else if (a.word === 'wrote' && checked !== 'PAYLOAD') {
          farOk = false;
          whys.push(`${s}: it answered wrote and the folder that was checked holds ${JSON.stringify(checked)}`);
        }
      }
      // `wrote` is the ONE honest answer here. The window is the first `shasum`
      // call, which the shipping file-put makes after its prelude and link walk,
      // so the folder was already checked when the link went in; the anchored
      // `.` makes the swap a no-op and the payload lands in the checked folder.
      // `notsame` would mean the window opened BEFORE the check, and then this
      // row tests nothing about the window (probe review, Phase 336: the first
      // version accepted it, and a text that hashed before checking passed).
      record('m9', 'a link swapped in inside one file-put, after its check and before its write', 'file-put', answers, ['wrote'], { farOk, farWhy: whys.join('; ') });
    }

    // ---------------------------------------------------------------- L (242, pin -)
    if (want('legacy')) {
      for (const sh of SHELLS) {
        const s = sh.split('/').pop();
        const L = join(T, `legacy-${s}`);
        const O = join(T, `outside-${s}`);
        mkdirSync(join(L, 'docs'), { recursive: true });
        mkdirSync(O, { recursive: true });
        writeFileSync(join(L, 'README.md'), '# legacy\n');
        writeFileSync(join(O, 'victim.txt'), 'victim\n');
        writeFileSync(join(O, 'leaf.txt'), 'leaf\n');
        writeFileSync(join(O, 'staged.txt'), 'staged\n');
        writeFileSync(join(O, 'hard.txt'), 'hard\n');
        symlinkSync(O, join(L, 'out-link'));
        symlinkSync(join(O, 'leaf.txt'), join(L, 'leaf.md'));
        symlinkSync(join(O, 'staged.txt'), join(L, 'docs', 'staged.md.tortie-part'));
        linkSync(join(O, 'hard.txt'), join(L, 'docs', 'hard.md.tortie-part'));
        const sib = makeRepo(join(T, `sibling-${s}`), H);
        writeFileSync(join(sib, 'dirty.txt'), 'dirty\n');
        symlinkSync(sib, join(L, 'escape'));
        const outsideBefore = Object.fromEntries(readdirSync(O).map((f) => [f, fileSha(join(O, f))]));
        const sibBefore = { index: fileSha(join(sib, '.git', 'index')), head: headOf(sib, H) };
        const arms = [
          ['a1 ../ in the relative path', 'file-put', { rel: 'docs/../../x.txt' }, ['badname']],
          ['a2 an absolute relative path', 'file-put', { rel: '/etc/x.txt' }, ['badname']],
          ['a5 put new through a link', 'file-put', { rel: 'out-link/new.txt' }, ['outside']],
          ['a5a put replace through a link', 'file-put', { rel: 'out-link/victim.txt', expect: fileSha(join(O, 'victim.txt')) }, ['outside']],
          ['a5b make a folder through a link', 'dir-new', { rel: 'out-link/made' }, ['outside']],
          ['a5c rename out through a link', 'entry-rename', { from: 'README.md', to: 'out-link/README.md' }, ['outside']],
          ['a5d rename in through a link', 'entry-rename', { from: 'out-link/victim.txt', to: 'in.txt' }, ['outside']],
          ['a8 put new at a leaf link', 'file-put', { rel: 'leaf.md' }, ['outside']],
          ['a8a put replace at a leaf link', 'file-put', { rel: 'leaf.md', expect: fileSha(join(O, 'leaf.txt')) }, ['outside']],
          ['a9 a link at the staged name', 'file-put', { rel: 'docs/staged.md' }, ['outside']],
          ['a12 a hard link at the staged name', 'file-put', { rel: 'docs/hard.md' }, ['wrote']],
          ['a10 stage through a linked cwd', 'git-stage', { repo: sib, list: 'dirty.txt', cwd: 'escape' }, ['outside']],
          ['a11 commit through a linked cwd', 'git-commit', { repo: sib, sha: sibBefore.head, cwd: 'escape' }, ['outside']],
          ['a plain save under the legacy root', 'file-put', { rel: 'docs/plain.md' }, ['wrote']]
        ];
        for (const [label, id, o, expect] of arms) {
          const a = far.run(sh, id, argsFor(id, { folder: L, pin: '-', ...o }), { home: H });
          rows.push({ group: 'legacy', label: `${label}, ${s}`, script: id, words: { [sh]: a.word }, expect, ok: expect.includes(a.word) });
          if (!expect.includes(a.word)) problems.push(`legacy ${s} "${label}": answered ${String(a.word)} with pin -, expected ${expect.join(' or ')} (today's answer)`);
        }
        const outsideAfter = Object.fromEntries(readdirSync(O).map((f) => [f, fileSha(join(O, f))]));
        if (JSON.stringify(outsideAfter) !== JSON.stringify(outsideBefore)) {
          problems.push(`legacy ${s}: the folder outside the legacy root moved: ${JSON.stringify(outsideBefore)} to ${JSON.stringify(outsideAfter)}`);
        }
        const sibAfter = { index: fileSha(join(sib, '.git', 'index')), head: headOf(sib, H) };
        if (JSON.stringify(sibAfter) !== JSON.stringify(sibBefore)) problems.push(`legacy ${s}: the sibling repository outside the root moved`);
        if (!existsSync(join(L, 'README.md'))) problems.push(`legacy ${s}: README.md left the legacy root`);
        // D16: the never-list does not apply to a legacy root, so one AT the far home still writes.
        const atHome = far.run(sh, 'file-put', argsFor('file-put', { folder: H, pin: '-', rel: `legacy-at-home-${s}.txt` }), { home: H });
        rows.push({ group: 'legacy', label: `a legacy root at the far home, ${s}`, script: 'file-put', words: { [sh]: atHome.word }, expect: ['wrote'], ok: atHome.word === 'wrote' });
        if (atHome.word !== 'wrote' || !existsSync(join(H, `legacy-at-home-${s}.txt`))) {
          problems.push(`legacy ${s}: a legacy root AT the far home answered ${String(atHome.word)}; D16 keeps today's bound, and today it writes`);
        }
      }
    }

    // ---------------------------------------------------------------- CS
    if (caseVolume && want('cs')) {
      await withCaseSensitiveImage(async (mount, note) => {
        if (mount === null) {
          problems.push(`cs: P336_CASE_VOLUME=1 asked for a case-sensitive image and none was made: ${String(note)}`);
          return;
        }
        const C = join(mount, 'p336');
        mkdirSync(join(C, 'home', '.ssh', 'keys'), { recursive: true });
        const CR = makeRepo(join(C, 'repo'), join(C, 'home'));
        mkdirSync(join(CR, '.GIT'), { recursive: true });
        const separate = identityOf(join(CR, '.git')) !== identityOf(join(CR, '.GIT'));
        rows.push({ group: 'cs', label: 'the volume separates .git and .GIT', script: '-', words: {}, ok: separate });
        if (!separate) problems.push('cs: on the image .git and .GIT are one folder, so it is not a case-sensitive volume');
        const CH = join(C, 'home');
        for (const [label, folder, expected] of [
          ['a .ssh folder by identity', join(CH, '.ssh', 'keys'), 'protected'],
          ['the .git folder by identity', join(CR, '.git'), 'protected']
        ]) {
          const answers = SHELLS.map((sh) => {
            const pin = far.pin(sh, folder, { home: CH });
            return far.run(sh, 'file-put', argsFor('file-put', { folder, pin, rel: 'cs.txt' }), { home: CH });
          });
          record('cs', label, 'file-put', answers, [expected]);
        }
        const answers = SHELLS.map((sh) => {
          const pin = far.pin(sh, CR, { home: CH });
          return far.run(sh, 'file-put', argsFor('file-put', { folder: CR, pin, rel: '.GIT/x' }), { home: CH });
        });
        record('cs', 'a .GIT relative name, a separate folder here, refused by the ASCII backstop', 'file-put', answers, ['protected'], {
          farOk: !existsSync(join(CR, '.GIT', 'x')),
          farWhy: '.GIT/x was made'
        });
      });
    }
  } finally {
    removeScratch();
    for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.off(sig, onSignal);
  }
  return { rows, problems, residual, scratchGone: !existsSync(scratch) };
}

async function main() {
  for (const sh of SHELLS) {
    if (!existsSync(sh)) {
      process.stderr.write(`${TAG} REFUSING TO RUN. ${sh} is not on this Mac, and every row must run under both shells (§Attack G1).\n`);
      process.exit(2);
    }
  }
  const texts = loadFarTexts();
  if (texts.loadError) {
    process.stderr.write(`${TAG} REFUSING TO RUN. The shipping catalogue did not load: ${texts.loadError}\n`);
    process.exit(2);
  }
  const only = (process.env['P336_SCRIPT_ONLY'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const caseVolume = process.env['P336_CASE_VOLUME'] === '1';
  const started = Date.now();
  const { rows, problems, residual, scratchGone } = await runArms({ texts, only, caseVolume });
  if (scratchGone === false) problems.push('the scratch tree was not removed');
  const groups = [...new Set(rows.map((r) => r.group))];
  for (const g of groups) {
    const mine = rows.filter((r) => r.group === g);
    say(`${g.padEnd(7)} ${String(mine.filter((r) => r.ok).length)} of ${String(mine.length)} rows hold`);
  }
  for (const r of residual) {
    say(`RESIDUAL (D10, stated, not graded): ${r.label} through ${r.script} with main bypassed answered ${JSON.stringify(r.words)}; .ssh now ${r.sshNow}. Main refuses this spelling on every product path.`);
  }
  if (!caseVolume) say('cs      not run: P336_CASE_VOLUME=1 runs it on a case-sensitive APFS image');
  const report = process.env['P336_SCRIPT_REPORT'];
  if (report) writeFileSync(report, `${JSON.stringify({ rows, problems, residual, caseVolume }, null, 2)}\n`);
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (problems.length > 0) {
    process.stdout.write(`\n${TAG} FAIL, ${String(problems.length)} in ${seconds} s:\n`);
    for (const p of problems) process.stdout.write(`  - ${p}\n`);
    process.exit(1);
  }
  process.stdout.write(
    `\n${TAG} PASS in ${seconds} s. ${String(rows.length)} rows under /bin/sh and /bin/dash, every one agreeing between the two, ` +
      'over the SHIPPING texts with main bypassed. The scratch tree is gone; nothing under a home was named.\n'
  );
}

const runAsProgram = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runAsProgram) await main();
