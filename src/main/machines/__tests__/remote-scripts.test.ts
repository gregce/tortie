/**
 * Phase 73 — the catalogue of commands Tortie may run on another machine.
 *
 * These tests read the TEXT of every script, because the safety of this
 * mechanism is a property of that text rather than of a guard around it. A
 * later edit that adds a `>` to a read script, or a second script that writes,
 * or a value concatenated into a script, fails here.
 *
 * `build/conformance-machines.mjs` conditions 35 to 40 assert the same rules
 * from outside the test runner, because a rule this size should fail two gates
 * rather than one.
 *
 * WHAT THIS FILE CANNOT SHOW. It cannot show that a machine runs these. That is
 * `node build/probe-remote-image.mjs`, which runs each one against a real sign
 * in server on 127.0.0.1 and prints what came back.
 */

import { describe, expect, it } from 'vitest';
import {
  REMOTE_SCRIPTS,
  REMOTE_SCRIPT_MARKER,
  REMOTE_SCRIPT_MAX_BYTES,
  remoteScript,
  remoteWriteScripts
} from '../remote-scripts';

/** Programs that can remove or replace something a person already had. */
const MUTATING = [
  'rm',
  'mv',
  'cp',
  'mkdir',
  'touch',
  'chmod',
  'chown',
  'ln',
  'dd',
  'tee',
  'truncate'
];

/** The git verbs ANY script in this catalogue may name. All three are reads. */
const GIT_VERBS = ['rev-parse', 'status', 'show'];

/** The two more verbs `git-clone` may name, and no other script may. */
const CLONE_VERBS = ['ls-remote', 'clone'];

function words(text: string): string[] {
  return text.split(/[\s;|&(){}]+/).filter((word) => word.length > 0);
}

/** Where one positional parameter sits in a script text. */
interface Positional {
  readonly index: number;
  readonly at: number;
  /** 'double' is expanded and safe. 'single' is literal. 'bare' splits. */
  readonly quoting: 'double' | 'single' | 'bare';
}

/**
 * Every `$1` to `$9` in one script, and how each one is quoted.
 *
 * A tiny scanner rather than a regular expression, because the question is
 * whether the parameter is INSIDE a double quoted string and a regular
 * expression cannot answer that: `"$d/$1"` is quoted and `$1` alone is not,
 * and the character in front of them is the same kind of thing.
 */
function positionals(text: string): Positional[] {
  const out: Positional[] = [];
  let single = false;
  let double = false;
  for (let at = 0; at < text.length; at += 1) {
    const ch = text[at];
    if (ch === "'" && !double) {
      single = !single;
      continue;
    }
    if (ch === '"' && !single) {
      double = !double;
      continue;
    }
    if (ch !== '$') continue;
    const next = text[at + 1] ?? '';
    if (next < '1' || next > '9') continue;
    out.push({
      index: Number(next),
      at,
      quoting: single ? 'single' : double ? 'double' : 'bare'
    });
  }
  return out;
}

describe('the catalogue', () => {
  it('holds twelve scripts and this release holds no others', () => {
    expect(REMOTE_SCRIPTS).toHaveLength(12);
    expect(REMOTE_SCRIPTS.map((script) => script.id).sort()).toEqual([
      // PHASE 90.3 added `tree-list`, which walks one folder tree to a fixed
      // depth in one call so the Explorer of a project on another machine can
      // list rows. It prunes `.git` and it writes nothing.
      //
      // PHASE 90.2 added `repo-find`, which walks one root for git folders and
      // writes nothing, and `git-clone`, which is the SECOND write in this
      // catalogue and the second write this product can make on another
      // computer.
      'dir-list',
      'git-clone',
      'image-put',
      'machine-facts',
      'program-find',
      'repo-find',
      'review-file',
      'review-list',
      'store-copy',
      'store-head',
      'store-list',
      'tree-list'
    ]);
  });

  it('gives every id exactly one script', () => {
    const ids = new Set(REMOTE_SCRIPTS.map((script) => script.id));
    expect(ids.size).toBe(REMOTE_SCRIPTS.length);
  });

  it('answers null for a name nobody wrote down', () => {
    expect(remoteScript('image-put')).not.toBeNull();
    expect(remoteScript('rm-rf')).toBeNull();
    expect(remoteScript('')).toBeNull();
    expect(remoteScript('IMAGE-PUT')).toBeNull();
  });

  it('has exactly TWO scripts that write, and names both of them', () => {
    // This is rule 6, and it is the one that keeps the size of what Tortie can
    // do to another person's computer at a known list rather than a count.
    // Phase 90.2 moved it from one to two, once and on purpose, and the list
    // stays exact so a third one fails here rather than passing quietly.
    const writers = remoteWriteScripts();
    expect(writers).toHaveLength(2);
    expect(writers.map((script) => script.id)).toEqual([
      'image-put',
      'git-clone'
    ]);
  });

  it('gives every script a reason that says why a repeat is safe', () => {
    for (const script of REMOTE_SCRIPTS) {
      expect(script.reason.length).toBeGreaterThan(30);
      expect(script.reason.endsWith('.')).toBe(true);
    }
  });
});

describe('every script text', () => {
  it('carries no backtick, so no value can be interpolated into one', () => {
    for (const script of REMOTE_SCRIPTS) {
      expect(script.text).not.toContain('`');
    }
  });

  it('begins set -e and then umask 077', () => {
    for (const script of REMOTE_SCRIPTS) {
      const lines = script.text.split('\n');
      expect(lines[0]).toBe('set -e');
      expect(lines[1]).toBe('umask 077');
    }
  });

  it('prints its payload between marker pairs and never an odd marker', () => {
    // Some scripts print one pair on each of two branches, being the file that
    // was there and the file that was not, so the count is 2 or 4 rather than
    // always 2. An ODD count is a script that opened a pair it never closed,
    // and an answer read out of that would be everything the far side printed
    // after it.
    for (const script of REMOTE_SCRIPTS) {
      const markers = script.text.split(REMOTE_SCRIPT_MARKER).length - 1;
      expect(markers, script.id).toBeGreaterThanOrEqual(2);
      expect(markers % 2, script.id).toBe(0);
    }
  });

  it('reads every value it takes, and reads no value it does not take', () => {
    // A declared parameter no line reads is a value nothing checks, and a line
    // that reads a parameter beyond the declared count reads a value no caller
    // was asked for. Both are how a script and its row come apart.
    for (const script of REMOTE_SCRIPTS) {
      const read = new Set(positionals(script.text).map((one) => one.index));
      for (let at = 1; at <= script.params; at += 1) {
        expect(read.has(at), `${script.id} never reads $${String(at)}`).toBe(true);
      }
      for (const index of read) {
        expect(index, `${script.id} reads $${String(index)}`).toBeLessThanOrEqual(
          script.params
        );
      }
    }
  });

  it('quotes every positional parameter it reads', () => {
    // An unquoted one is how a path holding a space becomes two arguments on
    // the far side. A literal one inside single quotes would be text rather
    // than the value, which is the other way the same mistake reads.
    for (const script of REMOTE_SCRIPTS) {
      for (const one of positionals(script.text)) {
        expect(
          one.quoting,
          `${script.id}: $${String(one.index)} at byte ${String(one.at)}`
        ).toBe('double');
      }
    }
  });

  it('fits inside one argument of the far side’s own login shell', () => {
    for (const script of REMOTE_SCRIPTS) {
      expect(script.text.length).toBeLessThan(REMOTE_SCRIPT_MAX_BYTES / 8);
    }
  });
});

describe('a read script', () => {
  const reads = REMOTE_SCRIPTS.filter((script) => script.mode === 'read');

  it('names no program that can remove or replace a file', () => {
    for (const script of reads) {
      const named = words(script.text).filter((word) => MUTATING.includes(word));
      expect(named, `${script.id} names ${named.join(', ')}`).toEqual([]);
    }
  });

  it('carries no redirection except 2>/dev/null', () => {
    for (const script of reads) {
      const rest = script.text.split('2>/dev/null').join('');
      expect(rest, script.id).not.toContain('>');
    }
  });

  it('names no git verb at all in the two reads Phase 90.2 could have used', () => {
    // `repo-find` reads an origin address out of `.git/config` with `awk`
    // rather than by asking git for it. That is what keeps the git verb list
    // untouched for it: a read that named a verb would widen the list for
    // every script at once.
    expect(remoteScript('repo-find')?.text).not.toContain('git ');
  });

  it('never puts a git verb anywhere but in its own text', () => {
    for (const script of reads) {
      if (!script.text.includes('git ')) continue;
      // Every word after the program name and its one flag is checked against
      // the three verbs, so a later edit cannot add `commit` or `checkout`.
      for (const match of script.text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)) {
        expect(GIT_VERBS, `${script.id} runs git ${String(match[1])}`).toContain(
          match[1]
        );
      }
    }
  });

  it('has a git verb that is text rather than a value', () => {
    // If a verb could arrive as `$1` a caller could turn a review into a
    // commit. Neither git line in this catalogue reads a parameter as its verb.
    for (const script of reads) {
      expect(script.text).not.toMatch(/git (?:--no-pager )?"?\$/);
    }
  });
});

describe('the image write', () => {
  const write = remoteScript('image-put');

  it('never opens a file that is already there', () => {
    // This is what makes the one write in the product safe to run twice, and it
    // is a property of the text: the `present` branch has no redirection in it.
    expect(write?.text).toContain('if [ -f "$f" ]; then');
    expect(write?.text).toContain('s=present');
  });

  it('aims every redirection at the temporary name', () => {
    const text = write?.text ?? '';
    const targets = [...text.matchAll(/(?<!2)>\s*("?\$?[A-Za-z_{][^\s;|]*)/g)].map(
      (match) => match[1]
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(target).toBe('"$t"');
  });

  it('moves the temporary name into place rather than writing over the real one', () => {
    expect(write?.text).toContain('t="$f.part"');
    expect(write?.text).toContain('mv "$t" "$f"');
  });

  it('builds the temporary name out of the image name and nothing else', () => {
    // Phase 96. The name used to end in `$$`, which is the far side shell's
    // process id. A temporary name built from it is a file nothing will ever
    // open again, so each interrupted upload left one more of them and nothing
    // removed any of them. The name is now decided by `$1` alone, and `$1` is a
    // checksum of the bytes, so one image has one temporary name for ever.
    expect(write?.text).not.toContain('$$');
  });

  it('creates its own directory mode 0700 and its files mode 0600', () => {
    expect(write?.text).toContain('mkdir -p "$d"; chmod 700 "$d"');
    expect(write?.text).toContain('chmod 600 "$t"');
  });

  it('tries both spellings of base64, because the two machines differ', () => {
    expect(write?.text).toContain('base64 -d');
    expect(write?.text).toContain('base64 -D');
  });

  it('reports the size and the checksum of what it now has', () => {
    expect(write?.text).toContain('wc -c < "$f"');
    expect(write?.text).toContain('shasum -a 256 "$f"');
    expect(write?.text).toContain('sha256sum "$f"');
    expect(write?.text).toContain('c=nosum');
  });

  it('writes under the far side’s own home and nowhere else', () => {
    // Tortie composes no home path for another computer. The one path in this
    // script is resolved by that machine's own shell from its own HOME.
    expect(write?.text).toContain('d="$HOME/.tortie/images"');
    const paths = [...(write?.text ?? '').matchAll(/"(\/[^"]*)"/g)];
    expect(paths).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// PHASE 84. The two reads this phase added
// ---------------------------------------------------------------------------

describe('the folder listing', () => {
  const dirList = remoteScript('dir-list');

  it('is a read that takes two values', () => {
    expect(dirList?.mode).toBe('read');
    expect(dirList?.params).toBe(2);
  });

  it('lists folders and never files', () => {
    // `ls -A -p` marks a directory with a trailing slash and the filter keeps
    // only those. A picker that listed files would be a file browser, and it
    // would send every file name in a home directory across for nothing.
    expect(dirList?.text).toContain('ls -A -p');
    expect(dirList?.text).toContain("grep '/$'");
  });

  it('counts the folders separately from the ones it lists', () => {
    // Without this a picker showing 500 of 900 would present 500 as all of them.
    expect(dirList?.text).toContain("grep -c '/$'");
    expect(dirList?.text).toContain('head -n "$2"');
  });

  it('answers a word for every state a folder can be in', () => {
    for (const word of ['missing', 'notdir', 'denied', 'ok']) {
      expect(dirList?.text, word).toContain(`__TORTIE_RUN__${word}`);
    }
  });

  it('lets that machine resolve its own home when no folder was named', () => {
    // Tortie composes no home path for another computer.
    expect(dirList?.text).toContain('if [ -z "$p" ]; then p="$HOME"; fi');
  });

  it('redirects nothing except the two noise silencers', () => {
    const redirects = [...(dirList?.text ?? '').matchAll(/>\s*\S+/g)].map(
      (hit) => hit[0]
    );
    expect(redirects).toEqual(['>/dev/null', '>/dev/null']);
  });
});

describe('the program search', () => {
  const find = remoteScript('program-find');

  it('is a read that takes three values', () => {
    expect(find?.mode).toBe('read');
    expect(find?.params).toBe(3);
  });

  /**
   * THE RULE THIS SCRIPT COULD HAVE BROKEN, and the reason it does not.
   *
   * Rule 2 of the catalogue is that every positional is read as `"$1"` to
   * `"$9"` and is always quoted. This script walks two LISTS, and `for d in $2`
   * would be a bare positional. So each list is read once, in quotes, into a
   * local name, and the word splitting happens on that local name under `IFS`.
   * The quoting test above covers every script; this one names the mechanism so
   * a later edit cannot undo it by going back to the obvious spelling.
   */
  it('reads each list into a local name before any loop walks it', () => {
    const text = find?.text ?? '';
    expect(text).toContain('p="$2"');
    expect(text).toContain('x="$3"');
    expect(text).toContain('for d in $p; do');
    expect(text).toContain('for d in $x; do');
    expect(text).not.toContain('for d in $2');
    expect(text).not.toContain('for d in $3');
    // Assigned BEFORE the loops, not after them.
    expect(text.indexOf('p="$2"')).toBeLessThan(text.indexOf('for d in $p'));
    expect(text.indexOf('x="$3"')).toBeLessThan(text.indexOf('for d in $x'));
  });

  it('splits on a colon, which is how every list of folders is written', () => {
    expect(find?.text).toContain('IFS=:');
  });

  it('tests for an executable file rather than for a name that exists', () => {
    expect(find?.text).toContain('[ -x "$d/$n" ]');
  });

  it('says which of the two lists the answer came from', () => {
    expect(find?.text).toContain('s=path');
    expect(find?.text).toContain('s=install');
  });

  it('answers the empty word when it found nothing', () => {
    expect(find?.text).toContain('"${s:-none}"');
    expect(find?.text).toContain('"${f:-none}"');
  });

  it('redirects nothing at all, because it only asks questions', () => {
    expect(find?.text).not.toContain('>');
  });
});

describe('the size limit', () => {
  it('is the kernel constant a Linux far side enforces', () => {
    // 32 pages of 4,096 bytes. It is not measured by this phase, and the module
    // header says so: no Linux machine was contacted.
    expect(REMOTE_SCRIPT_MAX_BYTES).toBe(32 * 4096);
  });
});

// ---------------------------------------------------------------------------
// PHASE 90.2. The walk that finds a project, and the second write
// ---------------------------------------------------------------------------

describe('the project walk', () => {
  const find = remoteScript('repo-find');

  it('is a read that takes three values', () => {
    expect(find?.mode).toBe('read');
    expect(find?.params).toBe(3);
  });

  it('lets that machine resolve its own home when no root was named', () => {
    // Tortie composes no home path for another computer. An empty first value
    // is that machine's own HOME, resolved by that machine's own shell.
    expect(find?.text).toContain('if [ -z "$r" ]; then r="$HOME"; fi');
  });

  it('asks for a directory named .git and never a file', () => {
    // A worktree and a submodule both carry a `.git` FILE rather than a
    // directory, so neither is found. That limit is stated on screen and in
    // the phase report rather than assumed away.
    expect(find?.text).toContain("-type d -name '.git'");
  });

  it('prunes the two folder names that hold no projects', () => {
    // Both names are constants in the text. No caller can change them.
    expect(find?.text).toContain('-name Library');
    expect(find?.text).toContain('-name node_modules');
  });

  it('reads the origin address with awk rather than with git', () => {
    expect(find?.text).toContain('awk ');
    expect(find?.text).toContain('"$g/config"');
  });

  it('holds no $ followed by a digit inside its awk program', () => {
    // An awk field reference inside single quotes reads to the positional
    // scanner above as a single quoted parameter, and the quoting rule would
    // fail on it. The origin reader uses a flag, sub() and print instead.
    const awkStart = (find?.text ?? '').indexOf("awk '");
    expect(awkStart).toBeGreaterThan(0);
    const awkEnd = (find?.text ?? '').indexOf("'", awkStart + 5);
    const program = (find?.text ?? '').slice(awkStart + 5, awkEnd);
    expect(program.length).toBeGreaterThan(20);
    expect(program).not.toMatch(/\$[0-9]/);
  });

  it('prints the address first and the folder as the rest of the line', () => {
    // A folder on another computer can hold a space in its name, so the path
    // has to be last. The address is base64 for the same reason.
    expect(find?.text).toContain("printf '%s %s\\n' \"$e\" \"$p\"");
    expect(find?.text).toContain('base64');
  });

  it('answers the empty word when the root is not there', () => {
    expect(find?.text).toContain('"${o:-none}"');
  });

  it('redirects nothing except the two noise silencers', () => {
    const rest = (find?.text ?? '').split('2>/dev/null').join('');
    expect(rest).not.toContain('>');
  });
});

describe('the project copy', () => {
  const clone = remoteScript('git-clone');

  it('is the second write and it takes two values', () => {
    expect(clone?.mode).toBe('write');
    expect(clone?.params).toBe(2);
  });

  it('tests the destination before it does anything else', () => {
    // This is what makes the write safe to run twice, and it is what stops it
    // ever opening a folder a person already had.
    const lines = (clone?.text ?? '').split('\n');
    expect(lines[4]).toBe('if [ -e "$d" ]; then');
    expect(clone?.text).toContain("printf '__TORTIE_RUN__exists none");
  });

  it('checks that the address can be reached before it copies anything', () => {
    const text = clone?.text ?? '';
    expect(text.indexOf('git ls-remote')).toBeGreaterThan(0);
    expect(text.indexOf('git ls-remote')).toBeLessThan(text.indexOf('git clone'));
  });

  it('turns off both password prompts on both git commands', () => {
    // A command that stops and waits for a password on a machine nobody is
    // watching is a hang, and a hang reads to a person as the app freezing.
    for (const line of (clone?.text ?? '').split('\n')) {
      if (!/git (ls-remote|clone)/.test(line)) continue;
      expect(line, line).toContain('GIT_TERMINAL_PROMPT=0');
      expect(line, line).toContain('GCM_INTERACTIVE=never');
    }
  });

  it('puts -- in front of the address on both git commands', () => {
    expect(clone?.text).toContain('git ls-remote -- "$u"');
    expect(clone?.text).toContain('git clone -- "$u" "$d"');
  });

  it('aims every redirection at /dev/null', () => {
    const targets = [
      ...(clone?.text ?? '').matchAll(/(?<!2)>\s*([^\s;|)]+)/g)
    ].map((match) => match[1]);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(target).toBe('/dev/null');
  });

  it('names timeout nowhere, because this kind of machine has no such program', () => {
    // The deadline is enforced on this Mac by execRemoteShell. `timeout` is GNU
    // coreutils and macOS does not ship it.
    expect(words(clone?.text ?? '')).not.toContain('timeout');
  });

  it('names no program that can remove or replace a file', () => {
    const named = words(clone?.text ?? '').filter((word) =>
      MUTATING.includes(word)
    );
    expect(named).toEqual([]);
  });

  it('answers one of exactly four words', () => {
    for (const word of ['exists', 'cloned', 'failed', 'unreachable']) {
      expect(clone?.text).toContain(`__TORTIE_RUN__${word} `);
    }
  });

  it('is the only script allowed to name its two verbs', () => {
    for (const script of REMOTE_SCRIPTS) {
      if (script.id === 'git-clone') continue;
      for (const match of script.text.matchAll(/git (?:--no-pager )?([a-z-]+)/g)) {
        expect(CLONE_VERBS, `${script.id} runs git ${String(match[1])}`).not.toContain(
          match[1]
        );
      }
    }
  });
});
