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

/** The only git verbs any script in this catalogue may name. */
const GIT_VERBS = ['rev-parse', 'status', 'show'];

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
  it('holds seven scripts and this release holds no others', () => {
    expect(REMOTE_SCRIPTS).toHaveLength(7);
    expect(REMOTE_SCRIPTS.map((script) => script.id).sort()).toEqual([
      'image-put',
      'machine-facts',
      'review-file',
      'review-list',
      'store-copy',
      'store-head',
      'store-list'
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

  it('has exactly ONE script that writes, and it is image-put', () => {
    // This is rule 6, and it is the one that keeps the size of what Tortie can
    // do to another person's computer at one known thing.
    const writers = remoteWriteScripts();
    expect(writers).toHaveLength(1);
    expect(writers[0]?.id).toBe('image-put');
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

describe('the one write', () => {
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
    expect(write?.text).toContain('t="$f.part.$$"');
    expect(write?.text).toContain('mv "$t" "$f"');
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

describe('the size limit', () => {
  it('is the kernel constant a Linux far side enforces', () => {
    // 32 pages of 4,096 bytes. It is not measured by this phase, and the module
    // header says so: no Linux machine was contacted.
    expect(REMOTE_SCRIPT_MAX_BYTES).toBe(32 * 4096);
  });
});
