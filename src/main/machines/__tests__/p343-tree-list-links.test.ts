/**
 * Phase 343 — the far `tree-list` text, RUN rather than read, over links.
 *
 * Every row runs the SHIPPING text out of the catalogue under `/bin/sh` AND
 * `/bin/dash` (when present) over one scratch tree, the issue's link and the
 * attack's hostile links among it (build/p343/SPEC.md S1), and reads what came
 * back between the markers. It spawns no ssh, contacts no machine, runs no
 * tmux and touches nothing outside the scratch directory, which is removed in
 * `afterAll`, except one read-only listing of `/` at depth 1. Every shell runs
 * with an environment built from nothing: a scratch `HOME` and `ZDOTDIR`,
 * `HISTFILE=/dev/null`, a fixed `PATH`, and no `TERM_SESSION_ID`.
 *
 * TODAY'S TEXT IS KEPT HERE AS A LITERAL, the text this phase replaced, so
 * the rule "an ordinary folder answers byte for byte what it answered before,
 * once the marks are taken off" is checked against the real old answer on
 * both shells, never against a description of it.
 */

import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { remoteScript } from '../remote-scripts';
import { entryOfLine, parseTreeList } from '../tree-list';

/** `TREE_LIST` as it shipped before Phase 343 (`ae8767c2`), byte for byte. */
const TODAY = [
  'set -e',
  'umask 077',
  'p="$1"',
  'if [ ! -e "$p" ]; then',
  "  printf '__TORTIE_RUN__missing %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'elif [ ! -d "$p" ]; then',
  "  printf '__TORTIE_RUN__notdir %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'elif [ ! -r "$p" ] || [ ! -x "$p" ]; then',
  "  printf '__TORTIE_RUN__denied %s\\n__TORTIE_RUN__\\n' \"$p\"",
  'else',
  '  o=$(find "$p" -maxdepth "$2" -mindepth 1 -name ".git" -prune -o -print' +
    ' 2>/dev/null |',
  '    head -n "$3" |',
  '    while IFS= read -r f; do',
  '      if [ -d "$f" ]; then printf "%s/\\n" "$f"; else printf "%s\\n" "$f"; fi',
  '    done)',
  '  c=$(find "$p" -maxdepth "$2" -mindepth 1 -name ".git" -prune -o -print' +
    ' 2>/dev/null | wc -l | tr -d " ")',
  "  printf '__TORTIE_RUN__ok %s %s\\n%s__TORTIE_RUN__\\n' \"${c:-0}\" \"$p\" \"${o:-}\"",
  'fi'
].join('\n');

const SHELLS = ['/bin/sh', '/bin/dash'].filter((shell) => existsSync(shell));
const SHIPPING = remoteScript('tree-list')?.text ?? '';

let scratch = '';
let zdot = '';
let home = '';
/** The project folder, `<fx>/proj`. */
let P = '';

beforeAll(() => {
  scratch = realpathSync(mkdtempSync(join(tmpdir(), 'p343-far-')));
  zdot = join(scratch, 'zdot');
  home = join(scratch, 'home-of-shell');
  mkdirSync(zdot);
  mkdirSync(home);
  // The entry's make-fixture.sh tree, written in node, with a stand-in `.git`
  // folder (pruned by name, as a real one is) and the three names S1 adds.
  const FX = join(scratch, 'fx');
  P = join(FX, 'proj');
  for (const dir of [
    'proj/src',
    'proj/.agent/skills/a-skill',
    'proj/node_modules/pkg',
    'proj/.claude',
    'proj/.git/objects',
    'outside/sub',
    'home/dev',
    'home/.ssh',
    'other'
  ]) {
    mkdirSync(join(FX, dir), { recursive: true });
  }
  const files: Record<string, string> = {
    'proj/README.md': 'hello\n',
    'proj/src/index.ts': 'export {}\n',
    'proj/.agent/skills/a-skill/SKILL.md': '# a skill\n',
    'proj/.agent/skills/notes.md': 'notes\n',
    'proj/node_modules/pkg/index.js': 'x\n',
    'proj/ignored.log': 'log\n',
    'proj/.gitignore': 'node_modules/\n*.log\n',
    'proj/.git/HEAD': 'ref: refs/heads/main\n',
    'proj/ends-with-at@': 'x',
    'proj/dot.': 'x',
    'proj/sp ace ': 'x',
    'outside/secret.txt': 'secret\n',
    'outside/sub/x.txt': 'x\n',
    'home/.ssh/id_standin': 'not a key, a stand-in\n',
    'other/README.md': 'other\n'
  };
  for (const [rel, body] of Object.entries(files)) writeFileSync(join(FX, rel), body);
  const links: Array<[string, string]> = [
    ['.claude/skills', '../.agent/skills'],
    ['linkIn', 'src'],
    ['linkInAbs', join(P, 'src')],
    ['linkOut', '../outside'],
    ['linkOutAbs', join(FX, 'outside')],
    ['linkFile', 'src/index.ts'],
    ['linkFileOut', '../outside/secret.txt'],
    ['dangling', 'nothing-here'],
    ['self', 'self'],
    ['loopRoot', '.'],
    ['up', '..'],
    ['linkFsRoot', '/'],
    ['linkHome', '../home'],
    ['linkSsh', '../home/.ssh'],
    ['linkDotGit', '.git'],
    ['linkOther', '../other'],
    ['chainA', 'chainB'],
    ['chainB', '.agent/skills'],
    ['src/linkIgnored', '../node_modules/pkg']
  ];
  for (const [at, target] of links) symlinkSync(target, join(P, at));
});

afterAll(() => {
  if (scratch.length > 0) rmSync(scratch, { recursive: true, force: true });
});

/** The environment every shell runs under, built from nothing. */
function envFor(): NodeJS.ProcessEnv {
  return { PATH: '/usr/bin:/bin', HOME: home, ZDOTDIR: zdot, HISTFILE: '/dev/null' };
}

/** Run one text, answering what was between the markers. */
function run(shell: string, text: string, root: string, depth = '3'): string {
  expect(text.length).toBeGreaterThan(0);
  const out = execFileSync(shell, ['-c', text, 'tortie-tree-list', root, depth, '4000'], {
    encoding: 'utf8',
    env: envFor(),
    maxBuffer: 64 * 1024 * 1024
  });
  const found = /__TORTIE_RUN__([\s\S]*?)__TORTIE_RUN__/.exec(out);
  return found === null ? `<no answer: ${out.slice(0, 80)}>` : found[1] ?? '';
}

/** The marks taken off: `///` to nothing, `//` to today's `/`. */
function unmark(answer: string): string {
  return answer
    .split('\n')
    .map((line) =>
      line.endsWith('///') ? line.slice(0, -3) : line.endsWith('//') ? line.slice(0, -1) : line
    )
    .join('\n');
}

function head(answer: string): string {
  return (answer.split('\n')[0] ?? '').replace(P, '<proj>');
}

function rows(answer: string): string[] {
  return answer.split('\n').slice(1).filter((line) => line.length > 0);
}

/** A line's path, its mark taken off. */
function pathOf(line: string): string {
  if (line.endsWith('///')) return line.slice(0, -3);
  if (line.endsWith('//')) return line.slice(0, -2);
  return line.endsWith('/') ? line.slice(0, -1) : line;
}

const folderLinks = (answer: string): string[] =>
  rows(answer)
    .filter((line) => line.endsWith('//') && !line.endsWith('///'))
    .map((line) => line.slice(P.length, -2))
    .sort();
const otherLinks = (answer: string): string[] =>
  rows(answer)
    .filter((line) => line.endsWith('///'))
    .map((line) => line.slice(P.length, -3))
    .sort();

describe.each(SHELLS)('the shipping tree-list under %s', (shell) => {
  it('an ordinary folder answers today\'s bytes once the marks are off', () => {
    for (const root of [P, join(P, 'src'), join(P, '.agent'), join(P, '..', 'outside')]) {
      const now = run(shell, SHIPPING, root);
      expect(unmark(now)).toBe(run(shell, TODAY, root));
    }
    expect(head(run(shell, SHIPPING, P))).toBe('ok 35 <proj>');
  });

  it('marks every link line: 15 to a folder, 4 to anything else', () => {
    const answer = run(shell, SHIPPING, P);
    expect(folderLinks(answer)).toEqual(
      [
        '/.claude/skills',
        '/chainA',
        '/chainB',
        '/linkDotGit',
        '/linkFsRoot',
        '/linkHome',
        '/linkIn',
        '/linkInAbs',
        '/linkOther',
        '/linkOut',
        '/linkOutAbs',
        '/linkSsh',
        '/loopRoot',
        '/src/linkIgnored',
        '/up'
      ].sort()
    );
    expect(otherLinks(answer)).toEqual(['/dangling', '/linkFile', '/linkFileOut', '/self']);
    // Nothing that is not a link carries a mark, and no link is walked into.
    for (const line of rows(answer)) {
      const path = pathOf(line);
      const isLink = lstatSync(path).isSymbolicLink();
      expect(line.endsWith('//')).toBe(isLink);
      if (isLink) expect(line.endsWith('///')).toBe(!(statSafe(path)?.isDirectory() ?? false));
    }
    const paths = rows(answer).map(pathOf);
    expect(paths.some((path) => path.startsWith(`${P}/loopRoot/`))).toBe(false);
    expect(paths.some((path) => path.startsWith(`${P}/.claude/skills/`))).toBe(false);
    expect(paths).toContain(`${P}/loopRoot`);
  });

  it('a name ending @, . or a space prints with no mark', () => {
    const lines = rows(run(shell, SHIPPING, P));
    for (const name of ['ends-with-at@', 'dot.', 'sp ace ']) {
      expect(lines).toContain(`${P}/${name}`);
    }
  });

  it('a link asked about as the folder is walked; today it answered nothing', () => {
    const skills = run(shell, SHIPPING, join(P, '.claude/skills'));
    expect(head(skills)).toBe('ok 3 <proj>/.claude/skills');
    expect(rows(skills).map((line) => line.slice(join(P, '.claude/skills').length))).toEqual(
      expect.arrayContaining(['/a-skill/', '/notes.md', '/a-skill/SKILL.md'])
    );
    expect(rows(skills)).toHaveLength(3);
    expect(head(run(shell, TODAY, join(P, '.claude/skills')))).toBe(
      'ok 0 <proj>/.claude/skills'
    );

    expect(head(run(shell, SHIPPING, join(P, 'chainA')))).toBe('ok 3 <proj>/chainA');
    expect(rows(run(shell, SHIPPING, join(P, 'chainA')))).toHaveLength(3);
    const out = run(shell, SHIPPING, join(P, 'linkOut'));
    expect(head(out)).toBe('ok 3 <proj>/linkOut');
    expect(rows(out).every((line) => !line.endsWith('//'))).toBe(true);
  });

  it('a loop asked about is walked once and nothing below it is followed', () => {
    const loop = run(shell, SHIPPING, join(P, 'loopRoot'));
    expect(head(loop)).toBe('ok 35 <proj>/loopRoot');
    expect(rows(loop)).toHaveLength(35);
    expect(rows(loop).filter((line) => line.endsWith('//'))).toHaveLength(19);
    const root = join(P, 'loopRoot');
    for (const line of rows(loop)) {
      // No proper ancestor below the folder asked about is a link.
      const rel = pathOf(line).slice(root.length + 1).split('/');
      for (let i = 1; i < rel.length; i += 1) {
        const ancestor = `${root}/${rel.slice(0, i).join('/')}`;
        expect(lstatSync(ancestor).isSymbolicLink()).toBe(false);
      }
    }
  });

  it('a link to a file is notdir, and one to nothing or to itself is missing', () => {
    expect(head(run(shell, SHIPPING, join(P, 'linkFile')))).toBe('notdir <proj>/linkFile');
    expect(head(run(shell, SHIPPING, join(P, 'dangling')))).toBe('missing <proj>/dangling');
    expect(head(run(shell, SHIPPING, join(P, 'self')))).toBe('missing <proj>/self');
  });

  // PHASE 343 (its fix round). A folder, and a link to one, whose name ENDS in
  // a space, read through the SHIPPING parser: the parse trimmed the root, so
  // every line was dropped and the folder opened empty on another machine
  // while the same folder listed on this Mac. Its own scratch folder, outside
  // the project, so no count above moves.
  it('a folder and a link whose names end in a space list their rows through the parse', () => {
    const trail = join(scratch, 'trail');
    if (!existsSync(trail)) {
      mkdirSync(join(trail, 'real ', 'sub'), { recursive: true });
      writeFileSync(join(trail, 'real ', 'a.txt'), 'a\n');
      symlinkSync('real ', join(trail, 'link '));
    }
    for (const name of ['real ', 'link ']) {
      const root = join(trail, name);
      const answer = parseTreeList(run(shell, SHIPPING, root));
      expect(answer?.status).toBe('ok');
      expect(answer?.root).toBe(root);
      expect((answer?.lines ?? []).map(entryOfLine).map((e) => e.path.slice(root.length)).sort()).toEqual([
        '/a.txt',
        '/sub'
      ]);
    }
  });

  it('a folder written with a trailing slash prints no doubled slash inside a line', () => {
    const answer = run(shell, SHIPPING, `${join(P, '.claude/skills')}/`);
    expect(head(answer)).toBe('ok 3 <proj>/.claude/skills/');
    for (const line of rows(answer)) expect(pathOf(line).includes('//')).toBe(false);
  });

  it('the root of the disk at depth 1: today\'s bytes, every link marked by its own stat', () => {
    const answer = run(shell, SHIPPING, '/', '1');
    expect(unmark(answer)).toBe(run(shell, TODAY, '/', '1'));
    expect(head(answer)).toBe(
      `ok ${String(readdirSync('/').filter((name) => name !== '.git').length)} /`
    );
    for (const line of rows(answer)) {
      expect(line.startsWith('//')).toBe(false);
      const path = pathOf(line);
      const isLink = lstatSync(path).isSymbolicLink();
      const toFolder = statSafe(path)?.isDirectory() ?? false;
      if (isLink) {
        expect(line).toBe(toFolder ? `${path}//` : `${path}///`);
      } else {
        expect(line).toBe(toFolder ? `${path}/` : path);
      }
    }
  });
});

describe('the two shells agree on every row', () => {
  it.runIf(SHELLS.length === 2)('sh and dash answer the same bytes', () => {
    const asks: Array<[string, string]> = [
      [P, '3'],
      [join(P, 'src'), '3'],
      [join(P, '.claude/skills'), '3'],
      [`${join(P, '.claude/skills')}/`, '3'],
      [join(P, 'chainA'), '3'],
      [join(P, 'loopRoot'), '3'],
      [join(P, 'linkOut'), '3'],
      [join(P, 'linkFile'), '3'],
      [join(P, 'dangling'), '3'],
      [join(P, 'self'), '3'],
      ['/', '1']
    ];
    for (const [root, depth] of asks) {
      expect(run('/bin/dash', SHIPPING, root, depth)).toBe(run('/bin/sh', SHIPPING, root, depth));
    }
  });
});

describe('the text follows a link only when it is the folder asked about', () => {
  it('sets -H inside the one test of the folder, hands it to both walks, and never -L', () => {
    expect(SHIPPING.split('\n')).toContain('if [ -L "$p" ]; then h=-H; fi');
    expect(SHIPPING.split('h=-H').length - 1).toBe(1);
    expect(SHIPPING.split('find $h "$p"').length - 1).toBe(2);
    expect([...SHIPPING.matchAll(/find /g)]).toHaveLength(2);
    expect(SHIPPING).not.toMatch(/find\s+(?:-\S+\s+)*-L/);
    expect(SHIPPING).not.toContain('-follow');
    expect([...SHIPPING.matchAll(/2>\/dev\/null/g)]).toHaveLength(2);
  });
});

function statSafe(path: string): ReturnType<typeof statSync> | null {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}
