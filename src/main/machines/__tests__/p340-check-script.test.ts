/**
 * Phase 340: the far check, its text, its command and its strict reader
 * (build/p340/SPEC.md D1, D2, D3, D15 as revised by §Attack).
 *
 * Three kinds of evidence, and the third is the one that can see a clause of the
 * script go missing:
 *
 *  1. The text, read: one line, the measured length, the clauses the attack
 *     added (`set -f`, the newline guard, `count=`, `-V` only for one program
 *     that was not found only in an install folder).
 *  2. The reader, over recorded bytes: the shapes the spec writer and the
 *     adversary measured, in the revised script's shape with `\r\n` line ends,
 *     and the REAL ssh capture over the loopback machine.
 *  3. The shipping script, DRIVEN under `/bin/sh` over scratch fixture trees,
 *     with a stand-in login shell so no real login shell runs: every shell this
 *     file starts has a scratch HOME and ZDOTDIR, HISTFILE=/dev/null and no
 *     TERM_SESSION_ID, and `spawnSync` returns only when it has ended.
 */

import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CHECK_MARKER,
  CHECK_PATH_MAX,
  CHECK_SCRIPT,
  LOGIN_MARKER,
  LOGIN_PATH_PROBE,
  REMOTE_TMUX_INSTALL_FOLDERS,
  checkPathPasses,
  composeCheckCommand,
  parseCheckAnswer,
  type MachineCheckFacts
} from '../check-script';
import { REMOTE_PATH_MARKER } from '../carriage';
import { validateMachinesFile } from '../schema';
import { MACHINE_LIMITS } from '@shared/machines';

const P = REMOTE_PATH_MARKER;
const C = CHECK_MARKER;

/** A block in the revised script's own shape, with `\r\n` line ends as a pty gives. */
function block(lines: readonly string[], eol = '\r\n'): string {
  return [C, ...lines, C].join(eol) + eol;
}

function facts(text: string): MachineCheckFacts {
  const out = parseCheckAnswer(text);
  if (out === null || out === 'malformed') {
    throw new Error(`expected a well formed block, got ${String(out)}`);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 1. The text
// ---------------------------------------------------------------------------

describe('the script text (D2 as revised)', () => {
  it('is one line, with no `!`, no single quote and no backslash pair', () => {
    expect(CHECK_SCRIPT).not.toContain('\n');
    expect(CHECK_SCRIPT).not.toContain('!');
    expect(CHECK_SCRIPT).not.toContain("'");
    expect(CHECK_SCRIPT).not.toContain('\\\\');
  });

  it('is the adversary’s measured text with the fix round’s path rule, 1,495 bytes', () => {
    // 1,379 bytes as the adversary measured it, plus 116 the fix round added:
    // `sq`, and the skips at the top of `add()` for a relative path, any
    // control character and a single quote.
    expect(Buffer.byteLength(CHECK_SCRIPT, 'utf8')).toBe(1495);
  });

  it('turns globbing off before anything is expanded (T3)', () => {
    const parts = CHECK_SCRIPT.split('; ');
    expect(parts[1]).toBe('set -f');
    expect(parts.indexOf('set -f')).toBeLessThan(
      parts.findIndex((p) => p.startsWith('lo='))
    );
  });

  it('skips a path holding a newline before it is counted or run (T2)', () => {
    expect(CHECK_SCRIPT).toContain('nl=$(printf "\\nx")');
    expect(CHECK_SCRIPT).toContain('nl=${nl%x}');
    expect(CHECK_SCRIPT).toContain('case "$2" in *[[:cntrl:]]*|*"$nl"*) return 0 ;; esac;');
  });

  it('skips every path the schema refuses before it is counted or run (the fix round)', () => {
    // A relative path, any control character and a single quote, in that
    // order, each a `case` of its own at the very top of `add()`, ahead of the
    // first test that touches the file. The quote is made with printf, because
    // the text may hold no quote of its own.
    expect(CHECK_SCRIPT).toContain('sq=$(printf "\\047")');
    expect(CHECK_SCRIPT).toContain(
      'add() { case "$2" in /*) ;; *) return 0 ;; esac; case "$2" in *[[:cntrl:]]*|*"$nl"*) return 0 ;; esac; case "$2" in *"$sq"*) return 0 ;; esac; [ -f "$2" ]'
    );
  });

  it('prints the count of what it found', () => {
    expect(CHECK_SCRIPT).toContain('printf "count=%s\\n" "$n"');
  });

  it('runs -V only for one program, and never for one found only in an install folder (T6)', () => {
    expect(CHECK_SCRIPT).toContain(
      'if [ "$n" -eq 1 ]; then if [ "$cs" = install ]; then printf "vskip=install\\n"; else v=$("$c" -V </dev/null 2>/dev/null | head -n 1);'
    );
    // `-V` appears exactly once.
    expect(CHECK_SCRIPT.split(' -V ')).toHaveLength(2);
  });

  it('tells programs apart by device and inode, GNU spelling first', () => {
    expect(CHECK_SCRIPT).toContain(
      'k=$(stat -L -c %d:%i -- "$2" 2>/dev/null || stat -L -f %d:%i -- "$2" 2>/dev/null)'
    );
  });

  it('reads the login PATH into a variable and never prints that variable', () => {
    expect(CHECK_SCRIPT).toContain(
      'lo=$("${SHELL:-/bin/sh}" -lc "$q" </dev/null 2>/dev/null)'
    );
    for (const part of CHECK_SCRIPT.split('; ')) {
      if (/\b(printf|echo)\b/.test(part)) {
        expect(part, part).not.toMatch(/printf[^;]*"\$lo"/);
        expect(part, part).not.toMatch(/echo[^;]*\$lo/);
      }
    }
  });

  it('prints its block between two copies of its marker, each on its own line', () => {
    expect(CHECK_SCRIPT.split(C)).toHaveLength(3);
    expect(CHECK_SCRIPT.startsWith('umask 077; set -f;')).toBe(true);
    expect(CHECK_SCRIPT.endsWith(`printf "%s\\n" ${C}`)).toBe(true);
  });

  it('names no install folder in its text: the folders cross as one argument', () => {
    for (const folder of REMOTE_TMUX_INSTALL_FOLDERS) {
      // A whole path word, so `/bin` inside `${SHELL:-/bin/sh}` is not a hit.
      const word = new RegExp(
        `(^|[^A-Za-z0-9_./~-])${folder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_./-]|$)`
      );
      expect(CHECK_SCRIPT, folder).not.toMatch(word);
    }
  });

  it('names no record file of identities and no ssh configuration file', () => {
    expect(CHECK_SCRIPT).not.toContain('known_hosts');
    expect(CHECK_SCRIPT).not.toContain('.ssh/config');
  });
});

describe('the login read (D2, the Phase 69 recipe with its own marker)', () => {
  it('is exactly the printf of PATH between two login markers', () => {
    expect(LOGIN_PATH_PROBE).toBe(
      'printf __TORTIE_LOGIN__%s__TORTIE_LOGIN__ "$PATH"'
    );
    expect(LOGIN_MARKER.startsWith('__TORTIE_')).toBe(true);
    expect(C.startsWith('__TORTIE_')).toBe(true);
  });
});

describe('the install folders (D3)', () => {
  it('are the thirteen, in this order', () => {
    expect(REMOTE_TMUX_INSTALL_FOLDERS).toEqual([
      '/opt/homebrew/bin',
      '/usr/local/bin',
      '/home/linuxbrew/.linuxbrew/bin',
      '~/.linuxbrew/bin',
      '/opt/local/bin',
      '/usr/bin',
      '/bin',
      '/snap/bin',
      '/run/current-system/sw/bin',
      '/nix/var/nix/profiles/default/bin',
      '~/.nix-profile/bin',
      '~/.local/bin',
      '~/bin'
    ]);
  });

  it('hold no `$`, `*`, `?`, `[` or `:`, and `~` only as a leading `~/`', () => {
    for (const folder of REMOTE_TMUX_INSTALL_FOLDERS) {
      expect(folder, folder).not.toMatch(/[$*?[:]/);
      if (folder.includes('~')) expect(folder.startsWith('~/'), folder).toBe(true);
      else expect(folder.startsWith('/'), folder).toBe(true);
    }
  });
});

describe('the far command (D1)', () => {
  it('is /bin/sh -c <script> tortie-check <typed> <probe> <folders>, quoted once', () => {
    const none = composeCheckCommand(null);
    expect(none.startsWith(`/bin/sh -c '${CHECK_SCRIPT}' tortie-check '' `)).toBe(true);
    expect(none).toContain(`'${LOGIN_PATH_PROBE}'`);
    expect(none.endsWith(`'${REMOTE_TMUX_INSTALL_FOLDERS.join(':')}'`)).toBe(true);
    expect(none.split(CHECK_SCRIPT)).toHaveLength(2);
  });

  it('carries a typed path as the fifth word', () => {
    expect(composeCheckCommand('/usr/local/bin/tmux')).toContain(
      ' tortie-check /usr/local/bin/tmux '
    );
    expect(composeCheckCommand('/opt/my tools/tmux')).toContain(
      " tortie-check '/opt/my tools/tmux' "
    );
  });

  it('is one line, so csh and tcsh carry it as the probe it replaces', () => {
    expect(composeCheckCommand(null)).not.toContain('\n');
    expect(composeCheckCommand(null)).not.toContain('!');
  });
});

// ---------------------------------------------------------------------------
// 2. The reader over recorded bytes
// ---------------------------------------------------------------------------

describe('parseCheckAnswer over the measured shapes, in the revised script’s shape', () => {
  const base = ['user=gdc', 'os=Darwin', 'login=read'];

  it('M4: one program in an install folder, not run', () => {
    const f = facts(
      block([
        ...base,
        'cand=install /opt/homebrew/bin/tmux',
        'count=1',
        'vskip=install',
        `${P}/opt/homebrew/bin/tmux${P}`
      ])
    );
    expect(f.candidates).toEqual([{ source: 'install', path: '/opt/homebrew/bin/tmux' }]);
    expect(f.vskip).toBe('install');
    expect(f.version).toBeNull();
    expect(f.user).toBe('gdc');
    expect(f.os).toBe('Darwin');
    expect(f.login).toBe('read');
  });

  it('M5 and M8: two or more distinct programs, none run, no pair', () => {
    const f = facts(
      block([
        ...base,
        'cand=login /yard/loginbin/tmux',
        'cand=login /yard/loginbin2/tmux',
        'cand=install /opt/homebrew/bin/tmux',
        'count=3'
      ])
    );
    expect(f.candidates.map((c) => c.source)).toEqual(['login', 'login', 'install']);
    expect(f.version).toBeNull();
  });

  it('M6: a login file’s own plain line before the block changes nothing', () => {
    const f = facts(
      'NOISE-ENV\r\n' +
        block([
          ...base,
          'cand=path /usr/local/bin/tmux',
          'count=1',
          'version=tmux 3.6a',
          `${P}/usr/local/bin/tmux${P}`
        ])
    );
    expect(f.candidates[0]?.path).toBe('/usr/local/bin/tmux');
    expect(f.version).toBe('tmux 3.6a');
  });

  it('M7: a typed path, present and missing', () => {
    const present = facts(
      block([
        ...base,
        'cand=typed /odd/tmux',
        'count=1',
        'version=tmux 3.9z',
        `${P}/odd/tmux${P}`
      ])
    );
    expect(present.candidates).toEqual([{ source: 'typed', path: '/odd/tmux' }]);
    expect(present.version).toBe('tmux 3.9z');
    const missing = facts(block([...base, 'typed=missing', 'count=0']));
    expect(missing.typedMissing).toBe(true);
    expect(missing.candidates).toEqual([]);
  });

  it('M9: one program reached by two spellings is one candidate, run once', () => {
    const f = facts(
      block([
        ...base,
        'cand=login /yard/loginbin/tmux',
        'count=1',
        'version=tmux 3.6a',
        `${P}/yard/loginbin/tmux${P}`
      ])
    );
    expect(f.candidates).toHaveLength(1);
  });

  it('M10: nothing found is a well formed block with no candidate', () => {
    const f = facts(block([...base, 'count=0']));
    expect(f.candidates).toEqual([]);
    expect(f.typedMissing).toBe(false);
  });

  it('M13 and M14: a `~/` folder, and a login shell that refused `-lc`', () => {
    const f = facts(
      block([
        'user=gdc',
        'os=Linux',
        'login=none',
        'cand=install /home/gdc/.local/bin/tmux',
        'count=1',
        'vskip=install',
        `${P}/home/gdc/.local/bin/tmux${P}`
      ])
    );
    expect(f.login).toBe('none');
    expect(f.os).toBe('Linux');
  });

  it('reads a candidate path holding a space whole', () => {
    const f = facts(
      block([
        ...base,
        'cand=login /opt/with space/tmux',
        'count=1',
        'version=tmux 3.6a',
        `${P}/opt/with space/tmux${P}`
      ])
    );
    expect(f.candidates[0]?.path).toBe('/opt/with space/tmux');
  });

  it('reads plain `\\n` and the `\\r\\r\\n` a terminal sometimes writes', () => {
    const lines = [...base, 'count=0'];
    expect(facts(block(lines, '\n')).candidates).toEqual([]);
    expect(facts(block(lines, '\r\r\n')).candidates).toEqual([]);
  });

  it('answers null for a buffer with no check marker at all', () => {
    expect(parseCheckAnswer('')).toBeNull();
    expect(parseCheckAnswer(`${P}/usr/bin/tmux${P}\n`)).toBeNull();
    expect(parseCheckAnswer('Permission denied (publickey).\r\n')).toBeNull();
  });
});

describe('a typed path reads the ONE block naming it, past blocks something else printed (the fix round)', () => {
  // The verifiers' S10: an EXIT trap printing Tortie's marker after the check
  // refused every check of that machine, typed or not, where the parent added
  // it by typing the path. With the path typed the program is not the far
  // side's to choose, so the one block naming exactly that path decides.
  const T = '/opt/homebrew/bin/tmux';
  const real = block(['user=gdc', 'os=Darwin', 'login=read', `cand=typed ${T}`, 'count=1', 'version=tmux 3.6a', `${P}${T}${P}`]);
  const evil = block(['user=evil', 'os=Darwin', 'login=read', 'cand=login /evil/tmux', 'count=1', 'version=tmux 3.6a', `${P}/evil/tmux${P}`]);
  const evilTyped = block(['user=evil', 'os=Darwin', 'login=read', `cand=typed ${T}`, 'count=1', 'version=tmux 3.9z', `${P}${T}${P}`]);

  it('a fake block before or after: the typed block decides, and only with the path given', () => {
    for (const text of [evil + real, real + evil, evil + real + evil]) {
      const f = parseCheckAnswer(text, T);
      expect(f === 'malformed' || f === null ? f : f.candidates).toEqual([{ source: 'typed', path: T }]);
      expect(f === 'malformed' || f === null ? null : f.version).toBe('tmux 3.6a');
      // With no typed path nothing is read past them.
      expect(parseCheckAnswer(text)).toBe('malformed');
    }
  });

  it('two blocks naming the typed path, or none, is still malformed', () => {
    expect(parseCheckAnswer(evilTyped + real, T)).toBe('malformed');
    expect(parseCheckAnswer(real + evilTyped, T)).toBe('malformed');
    expect(parseCheckAnswer(evil + real, '/usr/local/bin/tmux')).toBe('malformed');
    const missing = block(['user=gdc', 'os=Darwin', 'login=read', 'typed=missing', 'count=0']);
    expect(parseCheckAnswer(evil + missing, T)).toBe('malformed');
  });

  it('a block naming the path among others, or from another source, does not count', () => {
    const twoCands = block(['user=gdc', 'os=Darwin', 'login=read', `cand=typed ${T}`, 'cand=install /x/tmux', 'count=2']);
    const notTyped = block(['user=gdc', 'os=Darwin', 'login=read', `cand=login ${T}`, 'count=1', 'version=tmux 3.6a', `${P}${T}${P}`]);
    expect(parseCheckAnswer(evil + twoCands, T)).toBe('malformed');
    expect(parseCheckAnswer(evil + notTyped, T)).toBe('malformed');
  });

  it('an odd number of markers is still malformed, whatever is typed', () => {
    expect(parseCheckAnswer(real + `${C}\r\n`, T)).toBe('malformed');
    expect(parseCheckAnswer(`${C}\r\n` + real, T)).toBe('malformed');
  });

  it('one block alone reads as it always did, typed or not', () => {
    expect(parseCheckAnswer(real, T)).toEqual(parseCheckAnswer(real));
    expect(parseCheckAnswer(evil, T)).toEqual(parseCheckAnswer(evil));
  });
});

describe('parseCheckAnswer refuses what is not exactly one block of the script’s own lines (D15)', () => {
  const good = [
    'user=gdc',
    'os=Darwin',
    'login=read',
    'cand=install /opt/homebrew/bin/tmux',
    'count=1',
    'vskip=install',
    `${P}/opt/homebrew/bin/tmux${P}`
  ];
  const fake = block([
    'cand=install /evil/tmux',
    'count=1',
    'version=tmux 3.6a',
    `${P}/evil/tmux${P}`
  ]);

  it('takes the honest block (the control for every refusal below)', () => {
    expect(parseCheckAnswer(block(good))).not.toBe('malformed');
  });

  it('M6′ and F8: a whole fake block printed BEFORE the real one', () => {
    expect(parseCheckAnswer(fake + block(good))).toBe('malformed');
  });

  it('T1 and F9: a whole fake block printed AFTER, by an EXIT trap', () => {
    expect(parseCheckAnswer(block(good) + fake)).toBe('malformed');
  });

  it('one marker alone, or three', () => {
    expect(parseCheckAnswer(`${C}\r\nuser=gdc\r\n`)).toBe('malformed');
    expect(parseCheckAnswer(block(good) + `${C}\r\n`)).toBe('malformed');
  });

  it('a count that disagrees with the candidate lines', () => {
    const lines = good.map((l) => (l === 'count=1' ? 'count=2' : l));
    expect(parseCheckAnswer(block(lines))).toBe('malformed');
    const none = good.filter((l) => !l.startsWith('count='));
    expect(parseCheckAnswer(block(none))).toBe('malformed');
  });

  it('T2: a candidate split by a newline leaves a stray line', () => {
    // The DRAFT's real bytes for a login folder named `x<newline>version=tmux
    // 3.6a` (scratchpad/p340/adversary/attack1.json, T2-newline-folder), with
    // a `count=1` added as the revised script would print it. Two version lines
    // and a broken path pair: refused however the count reads.
    const raw =
      `${C}\nuser=gdc\nos=Darwin\nlogin=read\ncand=login /s/t2/x\n` +
      `version=tmux 3.6a/tmux\ncount=1\nversion=tmux 9.9z\n${P}/s/t2/x\n` +
      `version=tmux 3.6a/tmux${P}\n${C}\n`;
    expect(parseCheckAnswer(raw)).toBe('malformed');
    const stray = good.slice();
    stray.splice(4, 0, 'this line is not the script’s');
    expect(parseCheckAnswer(block(stray))).toBe('malformed');
  });

  it('a candidate that fails the schema’s path rule', () => {
    for (const path of ['tmux', "/opt/it's/tmux", `/a${'b'.repeat(CHECK_PATH_MAX)}`]) {
      const lines = good.map((l) =>
        l.startsWith('cand=') ? `cand=install ${path}` : l.startsWith(P) ? `${P}${path}${P}` : l
      );
      expect(parseCheckAnswer(block(lines)), path.slice(0, 20)).toBe('malformed');
    }
    const ctl = good.map((l) => (l.startsWith('cand=') ? 'cand=install /a\u0007/tmux' : l));
    expect(parseCheckAnswer(block(ctl))).toBe('malformed');
  });

  it('a path pair unequal to the one candidate, or missing, or doubled', () => {
    const other = good.map((l) => (l.startsWith(P) ? `${P}/evil/tmux${P}` : l));
    expect(parseCheckAnswer(block(other))).toBe('malformed');
    expect(parseCheckAnswer(block(good.filter((l) => !l.startsWith(P))))).toBe('malformed');
    expect(parseCheckAnswer(block([...good, `${P}/opt/homebrew/bin/tmux${P}`]))).toBe(
      'malformed'
    );
  });

  it('a pair or a version with other than one candidate', () => {
    const two = [
      'user=gdc',
      'os=Darwin',
      'login=read',
      'cand=login /a/tmux',
      'cand=install /b/tmux',
      'count=2'
    ];
    expect(parseCheckAnswer(block(two))).not.toBe('malformed');
    expect(parseCheckAnswer(block([...two, `${P}/a/tmux${P}`]))).toBe('malformed');
    expect(parseCheckAnswer(block([...two, 'version=tmux 3.6a']))).toBe('malformed');
  });

  it('a version for a program found only in an install folder, or a skip for one that was not', () => {
    const ran = good.map((l) => (l === 'vskip=install' ? 'version=tmux 3.6a' : l));
    expect(parseCheckAnswer(block(ran))).toBe('malformed');
    const login = good.map((l) =>
      l.startsWith('cand=') ? 'cand=login /opt/homebrew/bin/tmux' : l
    );
    expect(parseCheckAnswer(block(login))).toBe('malformed');
  });

  it('a key outside the closed set, a key twice, or a missing fixed line', () => {
    expect(parseCheckAnswer(block([...good, 'evil=1']))).toBe('malformed');
    expect(parseCheckAnswer(block([...good, 'user=root']))).toBe('malformed');
    expect(parseCheckAnswer(block(good.filter((l) => !l.startsWith('os='))))).toBe(
      'malformed'
    );
    expect(parseCheckAnswer(block(good.map((l) => (l === 'login=read' ? 'login=maybe' : l))))).toBe(
      'malformed'
    );
  });

  it('text sharing a line with a marker', () => {
    const text = `${C}user=gdc\r\n` + good.slice(1).join('\r\n') + `\r\n${C}\r\n`;
    expect(parseCheckAnswer(text)).toBe('malformed');
  });

  it('a block from the retired DRAFT check, which printed no count', () => {
    // M4's own bytes, as the spec writer's draft printed them.
    const draft =
      `${C}\nuser=gdc\nos=Darwin\nlogin=read\ncand=install /opt/homebrew/bin/tmux\n` +
      `version=tmux 3.6a\n${P}/opt/homebrew/bin/tmux${P}\n${C}\n`;
    expect(parseCheckAnswer(draft)).toBe('malformed');
  });
});

describe('the path rule is the schema’s own', () => {
  const samples = [
    '/opt/homebrew/bin/tmux',
    '/usr/local/bin/tmux',
    '/opt/with space/tmux',
    'tmux',
    'bin/tmux',
    "/opt/it's/tmux",
    '/a\u0007b/tmux',
    '/a\tb',
    `/${'a'.repeat(1023)}`,
    `/${'a'.repeat(1024)}`,
    '/'
  ];
  for (const path of samples) {
    it(JSON.stringify(path.slice(0, 24)), () => {
      const schema = validateMachinesFile({
        schema: 1,
        machines: [{ id: 'x', host: 'h', remoteTmuxPath: path }]
      });
      expect(checkPathPasses(path)).toBe(schema.problems.length === 0);
    });
  }

  it('holds the same ceiling the schema does', () => {
    expect(CHECK_PATH_MAX).toBe(MACHINE_LIMITS.maxRemotePath);
  });
});

describe('the REAL ssh capture over the loopback machine (OpenSSH 9.9p2, a pty)', () => {
  interface Chunk {
    text: string;
  }
  const capture = JSON.parse(
    readFileSync(join(__dirname, 'fixtures', 'p340-ssh-capture.json'), 'utf8')
  ) as Record<string, { chunks: Chunk[] }>;
  const R = '/private/tmp/p340-capture';
  const textOf = (key: string): string =>
    (capture[key]?.chunks ?? []).map((c) => c.text).join('').replaceAll('$R', R);

  it('a first contact answered yes, then the block: one install program, not run', () => {
    const f = facts(textOf('firstSeenAnsweredYes'));
    expect(f.candidates).toEqual([{ source: 'install', path: `${R}/inst/tmux` }]);
    expect(f.vskip).toBe('install');
    expect(f.version).toBeNull();
    expect(f.login).toBe('read');
    expect(f.os).toBe('Darwin');
  });

  it('a known machine: the same block, with nothing before it', () => {
    const f = facts(textOf('known'));
    expect(f.candidates).toHaveLength(1);
  });

  it('a first contact answered no: no block at all', () => {
    expect(parseCheckAnswer(textOf('firstSeenAnsweredNo'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. The shipping script, driven under /bin/sh over scratch trees
// ---------------------------------------------------------------------------

describe('the shipping script, driven under /bin/sh with a stand-in login shell', () => {
  let root = '';
  let log = '';

  /** A program named tmux that logs every run and answers a version. */
  const standin = (dir: string, version: string): string => {
    mkdirSync(dir, { recursive: true });
    const file = join(dir, 'tmux');
    writeFileSync(
      file,
      `#!/bin/sh\necho "RAN $0 $*" >> "${log}"\necho "tmux ${version}"\n`
    );
    chmodSync(file, 0o755);
    return file;
  };

  /**
   * Run the check exactly as the far `/bin/sh` would. `$SHELL` is a stand-in
   * login shell that sets the fixture's login PATH and runs the probe, so no
   * real login shell, and no file of the person's, is ever read.
   */
  const run = (
    name: string,
    opts: { loginPath?: string[]; folders?: string[]; typed?: string | null }
  ): { text: string; ran: string[]; exit: number | null } => {
    const dir = join(root, name);
    const home = join(dir, 'home');
    const zdot = join(dir, 'zdot');
    mkdirSync(home, { recursive: true });
    mkdirSync(zdot, { recursive: true });
    const loginFile = join(dir, 'login-path');
    writeFileSync(loginFile, (opts.loginPath ?? []).join(':'));
    const loginShell = join(dir, 'login-sh');
    writeFileSync(
      loginShell,
      `#!/bin/sh\nPATH=$(cat "${loginFile}")\nexport PATH\nexec /bin/sh -c "$2"\n`
    );
    chmodSync(loginShell, 0o755);
    const before = existsSync(log) ? readFileSync(log, 'utf8') : '';
    const out = spawnSync(
      '/bin/sh',
      [
        '-c',
        CHECK_SCRIPT,
        'tortie-check',
        opts.typed ?? '',
        LOGIN_PATH_PROBE,
        (opts.folders ?? []).join(':')
      ],
      {
        encoding: 'utf8',
        timeout: 20_000,
        cwd: home,
        env: {
          HOME: home,
          ZDOTDIR: zdot,
          HISTFILE: '/dev/null',
          PATH: '/usr/bin:/bin',
          SHELL: loginShell,
          TERM: 'dumb'
        }
      }
    );
    const after = existsSync(log) ? readFileSync(log, 'utf8') : '';
    return {
      text: out.stdout ?? '',
      ran: after.slice(before.length).split('\n').filter((l) => l.length > 0),
      exit: out.status
    };
  };

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), 'tortie-p340-check-'));
    log = join(root, 'ran.log');
  });

  afterAll(() => {
    if (root.length > 0) rmSync(root, { recursive: true, force: true });
  });

  it('this Mac has no tmux in the two folders the inner PATH names', () => {
    // The `path` route would otherwise add a candidate of its own.
    expect(existsSync('/usr/bin/tmux')).toBe(false);
    expect(existsSync('/bin/tmux')).toBe(false);
  });

  it('F1: one program in an install folder is found and NOT run', () => {
    const inst = join(root, 'f1', 'inst');
    standin(inst, '3.6a');
    const r = run('f1', { folders: [inst] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([{ source: 'install', path: join(inst, 'tmux') }]);
    expect(f.vskip).toBe('install');
    expect(f.login).toBe('read');
    expect(r.ran).toEqual([]);
    expect(r.exit).toBe(0);
  });

  it('F2: nothing anywhere is a block with no candidate', () => {
    const empty = join(root, 'f2', 'empty');
    mkdirSync(empty, { recursive: true });
    const f = facts(run('f2', { folders: [empty] }).text);
    expect(f.candidates).toEqual([]);
  });

  it('F3: two distinct programs are both listed and NEITHER is run', () => {
    const lb = join(root, 'f3', 'lb');
    const inst = join(root, 'f3', 'inst');
    standin(lb, '3.6a');
    standin(inst, '3.6b');
    const r = run('f3', { loginPath: [lb], folders: [inst] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([
      { source: 'login', path: join(lb, 'tmux') },
      { source: 'install', path: join(inst, 'tmux') }
    ]);
    expect(f.version).toBeNull();
    expect(r.ran).toEqual([]);
  });

  it('F4: a link to the same file is ONE program, by device and inode, run once', () => {
    const inst = join(root, 'f4', 'inst');
    const real = standin(inst, '3.6a');
    const lb = join(root, 'f4', 'lb');
    mkdirSync(lb, { recursive: true });
    symlinkSync(real, join(lb, 'tmux'));
    const r = run('f4', { loginPath: [lb], folders: [inst] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([{ source: 'login', path: join(lb, 'tmux') }]);
    expect(f.version).toBe('tmux 3.6a');
    expect(r.ran).toHaveLength(1);
    expect(r.ran[0]).toContain('-V');
  });

  it('F5: a program on the login PATH only is found by the login shell and run once', () => {
    const lb = join(root, 'f5', 'lb');
    standin(lb, '3.7c');
    const r = run('f5', { loginPath: [lb] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([{ source: 'login', path: join(lb, 'tmux') }]);
    expect(f.version).toBe('tmux 3.7c');
    expect(r.ran).toHaveLength(1);
  });

  it('F6: a `~/` folder is composed against the far HOME and not run', () => {
    const home = join(root, 'f6', 'home');
    standin(join(home, '.local', 'bin'), '3.6a');
    const r = run('f6', { folders: ['~/.local/bin'] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([
      { source: 'install', path: join(home, '.local', 'bin', 'tmux') }
    ]);
    expect(r.ran).toEqual([]);
  });

  it('F7: a typed path is checked alone, run once; a missing one says so', () => {
    const odd = standin(join(root, 'f7', 'odd'), '3.9z');
    const other = join(root, 'f7', 'inst');
    standin(other, '3.6a');
    const r = run('f7a', { typed: odd, folders: [other] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([{ source: 'typed', path: odd }]);
    expect(f.version).toBe('tmux 3.9z');
    expect(r.ran).toHaveLength(1);
    const m = facts(run('f7b', { typed: join(root, 'f7', 'nothing', 'tmux') }).text);
    expect(m.typedMissing).toBe(true);
    expect(m.candidates).toEqual([]);
  });

  it('F10: a login folder whose name holds a newline is skipped, and nothing runs', () => {
    const weird = join(root, 'f10', 'x\nversion=tmux 3.6a');
    standin(weird, '9.9z');
    const r = run('f10', { loginPath: [weird] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([]);
    expect(r.ran).toEqual([]);
  });

  it('F13: a relative entry and `.` on the login PATH are skipped beside a real program, and nothing runs', () => {
    // The verifiers' measured regression: `PATH=bin:$PATH` or a `.` entry
    // holding a program named tmux made the whole check `unknown` with no
    // sheet, beside a real program the parent found. Both resolve against the
    // far start folder, the home, which is the cwd here as sshd makes it.
    const home = join(root, 'f13r', 'home');
    standin(join(home, 'bin'), '9.9a');
    standin(home, '9.9b');
    const inst = join(root, 'f13r', 'inst');
    standin(inst, '3.6a');
    const r = run('f13r', { loginPath: ['bin', '.'], folders: [inst] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([{ source: 'install', path: join(inst, 'tmux') }]);
    expect(f.vskip).toBe('install');
    expect(r.ran).toEqual([]);
  });

  it('F14: a login folder whose name holds a single quote is skipped, and nothing runs', () => {
    const quoted = join(root, 'f14q', "o'brien");
    standin(quoted, '9.9c');
    const inst = join(root, 'f14q', 'inst');
    standin(inst, '3.6a');
    const r = run('f14q', { loginPath: [quoted], folders: [inst] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([{ source: 'install', path: join(inst, 'tmux') }]);
    expect(r.ran).toEqual([]);
  });

  it('F15: a login folder whose name holds a tab is skipped, and nothing runs', () => {
    const tabbed = join(root, 'f15t', 'a\tb');
    standin(tabbed, '9.9d');
    const inst = join(root, 'f15t', 'inst');
    standin(inst, '3.6a');
    const r = run('f15t', { loginPath: [tabbed], folders: [inst] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([{ source: 'install', path: join(inst, 'tmux') }]);
    expect(r.ran).toEqual([]);
  });

  it('F11: a glob on the login PATH is not expanded', () => {
    standin(join(root, 'f11', 'g1'), '3.6a');
    standin(join(root, 'f11', 'g2'), '3.6b');
    const r = run('f11', { loginPath: [join(root, 'f11', 'g*')] });
    const f = facts(r.text);
    expect(f.candidates).toEqual([]);
    expect(r.ran).toEqual([]);
  });

  it('F12: a path with a space is found whole', () => {
    const spaced = join(root, 'f12', 'with space');
    standin(spaced, '3.6a');
    const f = facts(run('f12', { loginPath: [spaced] }).text);
    expect(f.candidates).toEqual([{ source: 'login', path: join(spaced, 'tmux') }]);
  });

  it('a login shell that answers nothing reads `login=none` and still looks in the folders', () => {
    const inst = join(root, 'f13', 'inst');
    standin(inst, '3.6a');
    const dir = join(root, 'f13');
    mkdirSync(join(dir, 'home'), { recursive: true });
    const silent = join(dir, 'silent-sh');
    writeFileSync(silent, '#!/bin/sh\nexit 1\n');
    chmodSync(silent, 0o755);
    const out = spawnSync(
      '/bin/sh',
      ['-c', CHECK_SCRIPT, 'tortie-check', '', LOGIN_PATH_PROBE, inst],
      {
        encoding: 'utf8',
        timeout: 20_000,
        env: {
          HOME: join(dir, 'home'),
          ZDOTDIR: join(dir, 'home'),
          HISTFILE: '/dev/null',
          PATH: '/usr/bin:/bin',
          SHELL: silent
        }
      }
    );
    const f = facts(out.stdout ?? '');
    expect(f.login).toBe('none');
    expect(f.candidates).toHaveLength(1);
  });

  it('prints nothing the login shell printed, even its own marker text', () => {
    const lb = join(root, 'f14', 'lb');
    standin(lb, '3.6a');
    const r = run('f14', { loginPath: [lb] });
    expect(r.text).not.toContain(LOGIN_MARKER);
    expect(r.text.split(C)).toHaveLength(3);
  });
});
