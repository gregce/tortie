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
import { REMOTE_FILE_LIST_MAX_BYTES } from '@shared/ipc';
import { BRANCH_FORMAT } from '../../git/parse';
import { GRAPH_LOG_FORMAT } from '../../git/graph-parse';
import {
  REMOTE_SCRIPTS,
  REMOTE_SCRIPT_MARKER,
  REMOTE_SCRIPT_MAX_BYTES,
  REMOTE_SEARCH_MAX_BYTES,
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

/**
 * The git verbs ANY script in this catalogue may name. All eight are reads.
 *
 * PHASE 98 ADDED `ls-files`. The remote search asks git which files are in one
 * folder and reads them with that machine's own grep. Reading the index is a
 * read and it reaches no server.
 *
 * PHASE 106 ADDED `for-each-ref`, and it is the fifth. It reads the ref store
 * and it contacts no server, so it meets the same test the other four meet and
 * it takes the same exemption from the two prompt names.
 *
 * PHASE 107 ADDED `log`, `merge-base` and `rev-list`, and they are the sixth,
 * the seventh and the eighth. `log` walks the object database and prints
 * commits, `merge-base` reads two commits already in it and answers with a
 * third, and `rev-list` walks the same database and prints commit names. None
 * of the three opens a network connection and none of them writes a ref, an
 * index or a working tree file. Research 57 priced this widening at four verbs
 * and it is three, because `for-each-ref` joined the list in Phase 106 after
 * that research was written.
 */
const GIT_VERBS = [
  'rev-parse',
  'status',
  'show',
  'ls-files',
  'for-each-ref',
  'log',
  'merge-base',
  'rev-list'
];

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
  it('holds twenty scripts and this release holds no others', () => {
    expect(REMOTE_SCRIPTS).toHaveLength(20);
    expect(REMOTE_SCRIPTS.map((script) => script.id).sort()).toEqual([
      // PHASE 101 added `file-put`, which replaces one file under one confirmed
      // folder on a machine or makes a new empty one there. It is the THIRD
      // write in this catalogue and the first command this product sends that
      // can replace a file a person already had, so the write count below moved
      // from two to three. It names no git verb, so GIT_VERBS above did not
      // move.
      //
      // PHASE 109 added `agents-find`, which asks one machine in ONE call
      // which of Tortie's launchable agents exist there, so the create sheet
      // on a tab whose files live over there can grey the tiles that machine
      // really lacks. It is a batched `program-find` rather than a rewrite of
      // it, it tests `[ -f ]` beside `[ -x ]` from birth, it is a read, and
      // it writes nothing, so the write count below stays at two. It names no
      // git verb, so GIT_VERBS above did not move either.
      'agents-find',
      // PHASE 108 added `context-read`, which lists directories and reads
      // files back so the Context view on a tab that lives over there shows
      // what the agents THERE will load. The reader and every parser stay on
      // this Mac; the far side knows nothing about any agent. It is a read,
      // it writes nothing, and it names NO git verb, so neither the write
      // count below nor GIT_VERBS above moved.
      //
      // PHASE 107 added `repo-history`, which prints a page of the newest
      // commits in one folder so the History group on a tab that lives over
      // there draws the same picture the local History draws. It is a read and
      // it writes nothing, so the write count below stays at two. It added
      // three git verbs, being `log`, `merge-base` and `rev-list`, and
      // GIT_VERBS above holds eight for that reason.
      //
      // PHASE 106 added `repo-branch`, which prints one line about the branch
      // checked out in one folder so the Source Control view on a tab that
      // lives over there can say which branch it is. It is a read and it writes
      // nothing, so the write count below stays at two. It is the one script
      // since Phase 98 that added a git verb, being `for-each-ref`, and
      // GIT_VERBS above holds five for that reason.
      //
      // PHASE 105 added `repo-facts`, which prints four short strings about one
      // folder so the Runs section on a tab that lives over there can ask GitHub
      // about the right branch. It is a read, it writes nothing, and it names
      // one git verb which was already on the list, so neither the write count
      // below nor GIT_VERBS above moved.
      //
      // PHASE 99 added `repo-files`, which names every file in one folder so
      // the Quick Open palette on a tab that lives over there can rank them. It
      // carries names and never contents, it is a read, and it writes nothing,
      // so the write count below stays at two.
      //
      // PHASE 98 added `repo-search`, which prints every matching line in one
      // folder using that machine's own grep. It is a read and it writes
      // nothing, so the write count below stays at two.
      //
      // PHASE 90.3 added `tree-list`, which walks one folder tree to a fixed
      // depth in one call so the Explorer of a project on another machine can
      // list rows. It prunes `.git` and it writes nothing.
      //
      // PHASE 90.2 added `repo-find`, which walks one root for git folders and
      // writes nothing, and `git-clone`, which is the SECOND write in this
      // catalogue and the second write this product can make on another
      // computer.
      'context-read',
      'dir-list',
      'file-put',
      'git-clone',
      'image-put',
      'machine-facts',
      'program-find',
      'repo-branch',
      'repo-facts',
      'repo-files',
      'repo-find',
      'repo-history',
      'repo-search',
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

  it('has exactly THREE scripts that write, and names all of them', () => {
    // This is rule 6, and it is the one that keeps the size of what Tortie can
    // do to another person's computer at a known list rather than a count.
    // Phase 90.2 moved it from one to two and Phase 101 moved it from two to
    // three, once and on purpose each time, and the list stays exact so a
    // fourth one fails here rather than passing quietly. Phase 105, Phase 106,
    // Phase 107 and Phase 108 each added a read and left this number alone.
    const writers = remoteWriteScripts();
    expect(writers).toHaveLength(3);
    expect(writers.map((script) => script.id)).toEqual([
      'image-put',
      'git-clone',
      'file-put'
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

  it('tests for a regular file AND the execute bit, in both loops', () => {
    // PHASE 109. `[ -x ]` alone passes a DIRECTORY carrying the execute bit,
    // and that path reached `argv[0]` and the manifest row. Research 58
    // section 1.4 reproduced it against a real machine. Every execute test in
    // this script now stands beside a file test, and the count proves there
    // is no third loop with the old spelling.
    const text = find?.text ?? '';
    const pairs = [...text.matchAll(/\[ -f "\$d\/\$n" \] && \[ -x "\$d\/\$n" \]/g)];
    const executes = [...text.matchAll(/\[ -x "\$d\/\$n" \]/g)];
    expect(pairs).toHaveLength(2);
    expect(executes).toHaveLength(2);
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

// ---------------------------------------------------------------------------
// PHASE 109. The batched agent search
// ---------------------------------------------------------------------------

describe('the batched agent search', () => {
  const find = remoteScript('agents-find');

  it('is a read that takes three values', () => {
    expect(find?.mode).toBe('read');
    expect(find?.params).toBe(3);
  });

  /**
   * Rule 2 of the catalogue, the `program-find` mechanism. Each of the three
   * values is read once, in quotes, into a local name, and every split
   * happens on a local name under IFS. A loop over a bare positional would
   * end that rule for the whole catalogue.
   */
  it('reads all three values into local names before anything splits them', () => {
    const text = find?.text ?? '';
    expect(text).toContain('p="$1"');
    expect(text).toContain('x="$2"');
    expect(text).toContain('r="$3"');
    expect(text.indexOf('p="$1"')).toBeLessThan(text.indexOf('for d in $p'));
    expect(text.indexOf('x="$2"')).toBeLessThan(text.indexOf('for d in $x'));
    expect(text.indexOf('r="$3"')).toBeLessThan(text.indexOf('for line in $r'));
    expect(text).not.toMatch(/for\s+\w+\s+in\s+\$[1-9]/);
  });

  it('splits folders on a colon and records on a newline, under IFS', () => {
    // A configured path may hold a colon and may never hold a newline, which
    // is why the record separator is the newline. Both splits are IFS
    // assignments over local names.
    const text = find?.text ?? '';
    expect(text).toContain('IFS=:');
    expect(text).toContain("IFS='\n'");
  });

  it('tests for a regular file AND the execute bit, in every loop', () => {
    // The pair `program-find` gained in this same phase, carried from birth,
    // so the two scripts can never disagree about a directory that carries
    // the execute bit. Three loops, three pairs, no bare execute test.
    const text = find?.text ?? '';
    const pairs = [...text.matchAll(/\[ -f "\$d\/\$n" \] && \[ -x "\$d\/\$n" \]/g)];
    const executes = [...text.matchAll(/\[ -x "\$d\/\$n" \]/g)];
    expect(pairs).toHaveLength(3);
    expect(executes).toHaveLength(3);
  });

  it('names the source of every answer, and a fourth word for absent', () => {
    const text = find?.text ?? '';
    expect(text).toContain('s=path');
    expect(text).toContain('s=agent');
    expect(text).toContain('s=install');
    expect(text).toContain('${s:-none}');
  });

  it('names the folders it could not read, under one fixed word', () => {
    // An absent computed while a folder on the search list could not be read
    // is not a positive absent, and the caller downgrades every `none` in
    // that answer to unknown. The word is part of the text, so no far side
    // value can fake the section.
    expect(find?.text).toContain('unreadable');
    expect(find?.text).toContain('[ ! -r "$d" ] || [ ! -x "$d" ]');
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

// ---------------------------------------------------------------------------
// PHASE 98. The search that runs on the machine
// ---------------------------------------------------------------------------

describe('the remote search', () => {
  const search = remoteScript('repo-search');

  it('is a read that takes five values', () => {
    expect(search?.mode).toBe('read');
    expect(search?.params).toBe(5);
  });

  it('names exactly the two git verbs it needs, and both are reads', () => {
    const verbs = [
      ...new Set(
        [...(search?.text ?? '').matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
          (match) => match[1]
        )
      )
    ].sort();
    expect(verbs).toEqual(['ls-files', 'rev-parse']);
  });

  it('lists the untracked files git is not ignoring as well as the tracked ones', () => {
    // Research 57 measured `git ls-files -z` alone, which lists tracked files
    // only. A file an agent on that machine made five minutes ago would then
    // not be searched, and Phase 97 has just put exactly those files on a
    // person's screen in the Changes list.
    expect(search?.text).toContain(
      'git ls-files -z --cached --others --exclude-standard'
    );
  });

  it('puts the pattern behind -e in every grep it runs', () => {
    // A person searching for `-v` is searching for `-v`, not passing a flag.
    const calls = [...(search?.text ?? '').matchAll(/grep [^\n|]*/g)].map(
      (match) => match[0]
    );
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call, call).toContain('-e "$2"');
  });

  it('turns the flag letters into constants of its own', () => {
    // The letters are compared against constants and the value assigned is a
    // constant in the text, so a caller cannot put a word of its own on the
    // grep command line.
    expect(search?.text).toContain('case "$3" in *i*) ic="-i";; esac');
    expect(search?.text).toContain('case "$3" in *w*) wd="-w";; esac');
    expect(search?.text).toContain('case "$3" in *e*) rx="-E";; esac');
    expect(search?.text).toContain('rx="-F"');
  });

  it('caps the answer in lines, in characters per line and in bytes', () => {
    const branches = (search?.text ?? '')
      .split('\n')
      .filter((line) => line.includes('xargs -0 grep'));
    expect(branches).toHaveLength(2);
    for (const branch of branches) {
      expect(branch, branch).toContain('head -n "$4"');
      expect(branch, branch).toContain('cut -c "1-$5"');
      // ONE BYTE PAST THE CEILING. That byte is what makes the cut an answer
      // rather than a guess about the last byte of the body.
      expect(branch, branch).toContain(
        `head -c ${String(REMOTE_SEARCH_MAX_BYTES + 1)}`
      );
    }
  });

  it('agrees with the exported ceiling, because two copies go stale', () => {
    const caps = [...(search?.text ?? '').matchAll(/head -c ([0-9]+)/g)].map(
      (match) => Number(match[1])
    );
    expect(caps).toHaveLength(2);
    for (const cap of caps) expect(cap).toBe(REMOTE_SEARCH_MAX_BYTES + 1);
    expect(REMOTE_SEARCH_MAX_BYTES).toBe(4 * 1024 * 1024);
  });

  it('says whether the byte ceiling bit, rather than leaving it to be guessed', () => {
    // `head -c` cuts at a byte offset. About one cut in every average line
    // length lands on a newline, and an answer that ended cleanly would have
    // been read as a complete result set.
    const text = search?.text ?? '';
    expect(text).toContain('case "$o" in *==) p=2;; *=) p=1;; esac');
    expect(text).toContain('n=$(( ${#o} / 4 * 3 - p ))');
    expect(text).toContain(`if [ "$n" -gt ${String(REMOTE_SEARCH_MAX_BYTES)} ]`);
    const tests = [...text.matchAll(/"\$n" -gt ([0-9]+)/g)].map((match) =>
      Number(match[1])
    );
    expect(tests).toEqual([REMOTE_SEARCH_MAX_BYTES]);
  });

  it('prunes .git on the branch that walks a folder tree', () => {
    expect(search?.text).toContain("find . -name '.git' -prune -o -type f -print0");
  });

  it('answers one of exactly four words, a cut answer and a body', () => {
    for (const word of ['missing', 'badpattern']) {
      // The cut answer is `0` on both of these, because neither of them read a
      // byte of anybody's files.
      expect(search?.text).toContain(`__TORTIE_RUN__${word} 0 none`);
    }
    expect(search?.text).toContain('m=repo');
    expect(search?.text).toContain('m=walk');
    expect(search?.text).toContain('"${o:-none}"');
    expect(search?.text).toContain(
      "printf '__TORTIE_RUN__%s %s %s__TORTIE_RUN__"
    );
  });

  it('names no search engine, and no way of putting one on a machine', () => {
    // This is the executable form of research 57 section 2.1's refusal.
    const text = search?.text ?? '';
    for (const pattern of [/ripgrep/, /\brg\b/, /\bcurl\b/, /\bscp\b/, /\binstall\b/]) {
      expect(pattern.test(text), pattern.source).toBe(false);
    }
  });

  it('redirects nothing except the two noise silencers', () => {
    const rest = (search?.text ?? '').split('2>/dev/null').join('');
    expect(rest).not.toContain('>');
  });
});

// ---------------------------------------------------------------------------
// PHASE 99. The name list that runs on the machine
// ---------------------------------------------------------------------------

describe('the remote name list', () => {
  const files = remoteScript('repo-files');

  it('is a read that takes two values', () => {
    expect(files?.mode).toBe('read');
    expect(files?.params).toBe(2);
  });

  it('names exactly the two git verbs it needs, and both are reads', () => {
    // Both are already on the list Phase 98 left. This phase widened nothing.
    const verbs = [
      ...new Set(
        [...(files?.text ?? '').matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
          (match) => match[1]
        )
      )
    ].sort();
    expect(verbs).toEqual(['ls-files', 'rev-parse']);
    for (const verb of verbs) expect(GIT_VERBS).toContain(verb);
  });

  it('lists the untracked files git is not ignoring as well as the tracked ones', () => {
    // A file an agent on that machine made five minutes ago is a file a person
    // wants to open by name, and it is the case this feature exists for.
    expect(files?.text).toContain(
      'git ls-files --cached --others --exclude-standard'
    );
  });

  it('caps the answer in lines and in bytes on both of its branches', () => {
    const branches = (files?.text ?? '')
      .split('\n')
      .filter((line) => line.includes('o=$('));
    expect(branches).toHaveLength(2);
    for (const branch of branches) {
      // The cap PLUS ONE arrives as "$2", so a body with more lines than the
      // cap is proof the cap bit rather than a second walk of the tree.
      expect(branch, branch).toContain('head -n "$2"');
      // ONE BYTE PAST THE CEILING. That byte is what makes the cut an answer
      // rather than a guess about the last byte of the body.
      expect(branch, branch).toContain(
        `head -c ${String(REMOTE_FILE_LIST_MAX_BYTES + 1)}`
      );
    }
  });

  it('agrees with the exported ceiling, because two copies go stale', () => {
    const caps = [...(files?.text ?? '').matchAll(/head -c ([0-9]+)/g)].map(
      (match) => Number(match[1])
    );
    expect(caps).toHaveLength(2);
    for (const cap of caps) expect(cap).toBe(REMOTE_FILE_LIST_MAX_BYTES + 1);
    expect(REMOTE_FILE_LIST_MAX_BYTES).toBe(REMOTE_SEARCH_MAX_BYTES);
  });

  it('says whether the byte ceiling bit, rather than leaving it to be guessed', () => {
    const text = files?.text ?? '';
    expect(text).toContain('case "$o" in *==) p=2;; *=) p=1;; esac');
    expect(text).toContain('n=$(( ${#o} / 4 * 3 - p ))');
    const tests = [...text.matchAll(/"\$n" -gt ([0-9]+)/g)].map((match) =>
      Number(match[1])
    );
    expect(tests).toEqual([REMOTE_FILE_LIST_MAX_BYTES]);
  });

  it('prunes .git and node_modules on the branch that walks a folder', () => {
    // A folder that is not a repository can still hold one below it, and no
    // surface in this product asks for a repository's internals. `node_modules`
    // is pruned because a palette full of dependency files is a palette nobody
    // can find their own file in.
    expect(files?.text).toContain(
      "find . \\( -name '.git' -o -name 'node_modules' \\) -prune -o -type f -print"
    );
  });

  it('answers one of exactly three words, a cut answer and a body', () => {
    // The cut answer is `0` on the missing branch, because it read no bytes of
    // anybody's files.
    expect(files?.text).toContain('__TORTIE_RUN__missing 0 none');
    expect(files?.text).toContain('m=repo');
    expect(files?.text).toContain('m=walk');
    expect(files?.text).toContain('"${o:-none}"');
    expect(files?.text).toContain(
      "printf '__TORTIE_RUN__%s %s %s__TORTIE_RUN__"
    );
  });

  it('names no search engine, and no way of putting one on a machine', () => {
    const text = files?.text ?? '';
    for (const pattern of [/ripgrep/, /\brg\b/, /\bcurl\b/, /\bscp\b/, /\binstall\b/]) {
      expect(pattern.test(text), pattern.source).toBe(false);
    }
  });

  it('redirects nothing except the two noise silencers', () => {
    const rest = (files?.text ?? '').split('2>/dev/null').join('');
    expect(rest).not.toContain('>');
  });

  it('reads no file contents at all, so it needs no file size cap', () => {
    // It carries names. `cat`, `head -c` on a file and `base64` of a file are
    // the three ways this catalogue reads contents, and only the last appears
    // here, applied to the LIST rather than to a file.
    const text = files?.text ?? '';
    expect(text).not.toContain('cat ');
    expect(text).not.toContain('base64 "');
    expect(text).toContain('| base64 |');
  });
});

// ---------------------------------------------------------------------------
// PHASE 105. The four facts about one folder, read so the Runs section on a
// remote tab can ask GitHub about the right branch
// ---------------------------------------------------------------------------

describe('the remote repository facts', () => {
  const facts = remoteScript('repo-facts');

  it('is a read that takes one value', () => {
    expect(facts?.mode).toBe('read');
    expect(facts?.params).toBe(1);
  });

  it('names one git verb and it was already on the list', () => {
    // `symbolic-ref` is not needed because `rev-parse` answers the same
    // question, and `remote` is not needed because `awk` over the config answers
    // it, which is what `repo-find` already does. So ALLOWED_GIT_VERBS stays at
    // four and this phase widened nothing.
    const verbs = [
      ...new Set(
        [...(facts?.text ?? '').matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
          (match) => match[1]
        )
      )
    ].sort();
    expect(verbs).toEqual(['rev-parse']);
    for (const verb of verbs) expect(GIT_VERBS).toContain(verb);
  });

  it('runs three git processes and no more', () => {
    const calls = [...(facts?.text ?? '').matchAll(/git rev-parse/g)];
    expect(calls).toHaveLength(3);
  });

  it('asks for the common git directory and never the worktree one', () => {
    // MEASURED on 2026-08-20 in a linked worktree: `--git-common-dir` answered
    // `/Users/gdc/gmux/.git`, whose config holds the origin, and
    // `--absolute-git-dir` answered `/Users/gdc/gmux/.git/worktrees/wt-p105`,
    // which holds no origin at all. Research 57 section 9 defect 5 records the
    // second spelling in `src/main/git/service.ts`, and it must not be copied
    // here: a Runs section built on it reports "no GitHub address" for a
    // worktree that has one.
    expect(facts?.text).toContain('git rev-parse --git-common-dir');
    expect(facts?.text).not.toContain('--absolute-git-dir');
  });

  it('reports no branch on a detached head rather than a branch called HEAD', () => {
    // `git rev-parse --symbolic-full-name HEAD` prints the word `HEAD` there,
    // and a branch called HEAD handed to gh is a question about a branch nobody
    // has. The value is kept only when it begins refs/heads/.
    expect(facts?.text).toContain('case "$h" in refs/heads/*) b=${h#refs/heads/};; esac');
  });

  it('reports no commit in a repository with no commits', () => {
    // Without --verify --quiet that repository prints the literal string HEAD on
    // stdout, which would have been drawn on screen as a commit.
    expect(facts?.text).toContain('git rev-parse --verify --quiet HEAD');
  });

  it('reads the origin out of the config with awk, the way repo-find does', () => {
    expect(facts?.text).toContain('awk ');
    expect(facts?.text).toContain('"$g/config"');
    // An awk field reference inside single quotes reads to this file's own
    // scanner as a quoted positional, so the origin reader uses a flag, sub()
    // and print instead. The rule is about the awk PROGRAM, which is the text
    // between the single quotes, rather than about the whole script.
    const program = /awk '([^']*)'/.exec(facts?.text ?? '')?.[1] ?? '';
    expect(program.length).toBeGreaterThan(0);
    expect(program).not.toMatch(/\$[0-9]/);
  });

  it('answers one of exactly four words, and three none fields on three of them', () => {
    for (const word of ['missing', 'denied', 'notrepo']) {
      expect(facts?.text).toContain(`__TORTIE_RUN__${word} none none none`);
    }
    expect(facts?.text).toContain(
      "printf '__TORTIE_RUN__repo %s %s %s__TORTIE_RUN__"
    );
    expect(facts?.text).toContain('"${e:-none}" "${n:-none}" "${s:-none}"');
  });

  it('names no credential and no way of asking GitHub anything', () => {
    // THE PROPERTY THE WHOLE FEATURE RESTS ON. The gh program runs on this Mac
    // and never leaves it. Condition 55d of build/conformance-machines.mjs
    // asserts the same nine words from outside the test runner.
    const text = facts?.text ?? '';
    for (const word of [
      'gh',
      'GH_TOKEN',
      'GITHUB_TOKEN',
      'GH_HOST',
      'Authorization',
      'hosts.yml',
      '.config/gh',
      'netrc',
      'curl'
    ]) {
      expect(text.includes(word), word).toBe(false);
    }
  });

  it('redirects nothing except the four noise silencers', () => {
    const text = facts?.text ?? '';
    expect([...text.matchAll(/2>\/dev\/null/g)]).toHaveLength(4);
    expect(text.split('2>/dev/null').join('')).not.toContain('>');
  });

  it('reads no file contents at all', () => {
    // It carries four short strings. `base64` is applied to two values this
    // script computed, never to a file.
    const text = facts?.text ?? '';
    expect(text).not.toContain('cat ');
    expect(text).not.toContain('head -c');
    expect(text).not.toContain('base64 "');
  });
});

// ---------------------------------------------------------------------------
// PHASE 106. The branch checked out in one folder, read so the Source Control
// view on a remote tab can name it
// ---------------------------------------------------------------------------

describe('the remote branch read', () => {
  const branch = remoteScript('repo-branch');

  it('is a read that takes one value', () => {
    expect(branch?.mode).toBe('read');
    expect(branch?.params).toBe(1);
  });

  it('names two git verbs and one of them is the verb this phase added', () => {
    const verbs = [
      ...new Set(
        [...(branch?.text ?? '').matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
          (match) => match[1]
        )
      )
    ].sort();
    expect(verbs).toEqual(['for-each-ref', 'rev-parse']);
    for (const verb of verbs) expect(GIT_VERBS).toContain(verb);
  });

  it('runs two rev-parse processes and one for-each-ref, and no more', () => {
    expect([...(branch?.text ?? '').matchAll(/git rev-parse/g)]).toHaveLength(2);
    expect([...(branch?.text ?? '').matchAll(/git for-each-ref/g)]).toHaveLength(1);
  });

  it('asks with a format that is BRANCH_FORMAT minus the subject', () => {
    // TWO COPIES OF ONE FORMAT IS HOW ONE OF THEM GOES STALE. The far side
    // prints this and `parseForEachRefBranches` reads it, so if they ever
    // disagree the main side reads the wrong field as a branch name. The
    // subject is the one field of BRANCH_FORMAT with no length bound and this
    // read carries no cut, so it is not asked for and the trailing %1f leaves
    // the seventh field empty. Condition 56d of build/conformance-machines.mjs
    // asserts the same relation from outside the test runner.
    const format = /--format='([^']*)'/.exec(branch?.text ?? '')?.[1] ?? '';
    expect(format.length).toBeGreaterThan(0);
    expect(format + '%(subject)').toBe(BRANCH_FORMAT);
  });

  it('asks for the common git directory and never the worktree one', () => {
    // Research 57 section 9 defect 5. A linked worktree must answer as a
    // repository, and `--absolute-git-dir` answers with the worktree's own
    // directory.
    expect(branch?.text).toContain('git rev-parse --git-common-dir');
    expect(branch?.text).not.toContain('--absolute-git-dir');
  });

  it('reports no branch on a detached head rather than a branch called HEAD', () => {
    // `git rev-parse --symbolic-full-name HEAD` prints the word HEAD there, and
    // a branch called HEAD is a branch nobody has. The value is kept only when
    // it begins refs/heads/, and everything else prints `nobranch`.
    expect(branch?.text).toContain('case "$h" in');
    expect(branch?.text).toContain('      refs/heads/*)');
    expect(branch?.text).toContain('__TORTIE_RUN__nobranch none__TORTIE_RUN__');
  });

  it('answers one of exactly six words, and none on five of them', () => {
    for (const word of ['missing', 'denied', 'notrepo', 'nodetails', 'nobranch']) {
      expect(branch?.text).toContain(`__TORTIE_RUN__${word} none__TORTIE_RUN__`);
    }
    expect(branch?.text).toContain(
      "printf '__TORTIE_RUN__repo %s__TORTIE_RUN__"
    );
  });

  it('has a word for a git too old to answer the format', () => {
    // `nobracket` was added to git in 2.13. An older git refuses the whole
    // format, `for-each-ref` prints nothing and exits non-zero, and without
    // this branch the answer would be `repo` with an empty payload, which reads
    // as no branch at all. That names the wrong cause.
    expect(branch?.text).toContain('nobracket');
    expect(branch?.text).toContain('        if [ -z "$r" ]; then');
  });

  it('never fetches, and this is the executable form of a sentence on screen', () => {
    // `branchCountsAreThatMachines` tells a person the counts are measured
    // against the copy of the upstream that machine last fetched. Condition 56i
    // of build/conformance-machines.mjs asserts the same three names from
    // outside the test runner.
    const text = branch?.text ?? '';
    for (const verb of ['git fetch', 'git pull', 'git remote update']) {
      expect(text.includes(verb), verb).toBe(false);
    }
  });

  it('encodes its one answer so a field holding a space survives', () => {
    // `%(upstream:track,nobracket)` prints "ahead 2, behind 1", which holds two
    // spaces and a comma, and the answer is read as whitespace separated words.
    expect(branch?.text).toContain('| base64 | tr -d ');
  });

  it('redirects nothing except the three noise silencers', () => {
    const text = branch?.text ?? '';
    expect([...text.matchAll(/2>\/dev\/null/g)]).toHaveLength(3);
    expect(text.split('2>/dev/null').join('')).not.toContain('>');
  });

  it('reads no file contents at all', () => {
    const text = branch?.text ?? '';
    expect(text).not.toContain('cat ');
    expect(text).not.toContain('head -c');
    expect(text).not.toContain('base64 "');
  });
});

describe('the remote history read', () => {
  const history = remoteScript('repo-history');

  it('is a read that takes two values', () => {
    expect(history?.mode).toBe('read');
    expect(history?.params).toBe(2);
  });

  it('names four git verbs and three of them are the ones this phase added', () => {
    const verbs = [
      ...new Set(
        [...(history?.text ?? '').matchAll(/git (?:--no-pager )?([a-z-]+)/g)].map(
          (match) => match[1]
        )
      )
    ].sort();
    expect(verbs).toEqual(['log', 'merge-base', 'rev-list', 'rev-parse']);
    for (const verb of verbs) expect(GIT_VERBS).toContain(verb);
  });

  it('runs three rev-parse processes, one log, one merge-base and one rev-list', () => {
    const text = history?.text ?? '';
    expect([...text.matchAll(/git rev-parse/g)]).toHaveLength(3);
    expect([...text.matchAll(/git --no-pager log/g)]).toHaveLength(1);
    expect([...text.matchAll(/git merge-base/g)]).toHaveLength(1);
    expect([...text.matchAll(/git rev-list/g)]).toHaveLength(1);
  });

  it('asks with the format the graph parser already reads', () => {
    // TWO COPIES OF ONE FORMAT IS HOW ONE OF THEM GOES STALE. The far side
    // prints this and `parseGraphLog` reads it, so if they ever disagree the
    // main side reads the wrong field as a commit subject. This file imports
    // nothing, so the literal is written out in the script and condition 57d of
    // build/conformance-machines.mjs asserts the same relation from outside the
    // test runner.
    const format = /--format='([^']*)'/.exec(history?.text ?? '')?.[1] ?? '';
    expect(format).toBe(GRAPH_LOG_FORMAT);
  });

  it('walks branches, tags and remote branches, and never stdin or all', () => {
    // `git log --stdin` WALKS HEAD WHEN ITS INPUT IS EMPTY, and it does so
    // silently. Measured on 2026-08-20 against git 2.50.1: `printf '' | git log
    // --stdin` printed the HEAD commit and `printf '\n' | git log --stdin`
    // printed it too. A `for-each-ref` on the far side that printed nothing
    // would therefore answer with a HEAD only walk while this end believed it
    // had asked for every branch, tag and remote branch. `--branches --tags
    // --remotes` cannot fall back, because there is no list that can be empty.
    //
    // `--all` is refused for research 24's reason. It drags in `refs/stash` and
    // `refs/notes/*`, which are not history a person reasons about.
    const text = history?.text ?? '';
    expect(text).toContain('--branches --tags --remotes');
    expect(text).not.toContain('--stdin');
    expect(text).not.toContain('--all');
    expect(text).not.toContain('refs/stash');
    expect(text).not.toContain('refs/notes');
  });

  it('asks for the common git directory and never the worktree one', () => {
    // Research 57 section 9 defect 5. A linked worktree must answer as a
    // repository, and `--absolute-git-dir` answers with the worktree's own
    // directory. Row 8 of `node build/probe-p107-history.mjs` is the row that
    // fails when the wrong spelling is used.
    expect(history?.text).toContain('git rev-parse --git-common-dir');
    expect(history?.text).not.toContain('--absolute-git-dir');
  });

  it('answers one of exactly four words, and none five times on three of them', () => {
    for (const word of ['missing', 'denied', 'notrepo']) {
      expect(history?.text).toContain(
        `__TORTIE_RUN__${word} none none none none none__TORTIE_RUN__`
      );
    }
    expect(history?.text).toContain(
      "printf '__TORTIE_RUN__repo %s %s %s %s %s__TORTIE_RUN__"
    );
  });

  it('reads the count as a quoted positional and never as text', () => {
    // `--max-count="$2"` is a caller value used as an argument. Main clamps it
    // to an integer between 1 and 501 before it is sent, and the same value is
    // used for the walk and for the marks so the two describe one window.
    const text = history?.text ?? '';
    expect([...text.matchAll(/--max-count="\$2"/g)]).toHaveLength(2);
  });

  it('never fetches, and this is the executable form of a sentence on screen', () => {
    // The marks are measured against the copy of the upstream that machine last
    // fetched. Condition 57g of build/conformance-machines.mjs asserts the same
    // three names from outside the test runner.
    const text = history?.text ?? '';
    for (const verb of ['git fetch', 'git pull', 'git remote update']) {
      expect(text.includes(verb), verb).toBe(false);
    }
  });

  it('encodes both answers so a commit subject holding anything survives', () => {
    // A subject can hold a newline, a space and a NUL, and the answer is read
    // as whitespace separated words.
    expect(
      [...(history?.text ?? '').matchAll(/\| base64 \| tr -d /g)]
    ).toHaveLength(2);
  });

  it('redirects nothing except the six noise silencers', () => {
    const text = history?.text ?? '';
    expect([...text.matchAll(/2>\/dev\/null/g)]).toHaveLength(6);
    expect(text.split('2>/dev/null').join('')).not.toContain('>');
  });

  it('reads no file contents at all, so it cannot show a commit’s files', () => {
    const text = history?.text ?? '';
    expect(text).not.toContain('cat ');
    expect(text).not.toContain('head -c');
    expect(text).not.toContain('git show');
  });
});
