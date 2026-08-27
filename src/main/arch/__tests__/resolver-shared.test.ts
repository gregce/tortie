/**
 * The three leaf modules the resolver arms share (Phase 157).
 *
 * WHY THESE HAVE A TEST OF THEIR OWN. They were EXTRACTED rather than written:
 * three arms arrived in parallel each carrying its own copy, and the duplicate
 * scan CLAUDE.md's growth guardrail asks for after parallel work found
 * `readTextOrNull` three times, `normalizeRel` twice, a ten line directory glob
 * expander twice, and the same quote tracking loop nine times across the two
 * TOML readers. Merging copies is where behaviour moves silently, so the cases
 * below are the ones where the copies DISAGREED, plus the rule the answers
 * module exists to state.
 */

import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  external,
  firstParty,
  unresolved,
  unverifiable
} from '../resolver/answers';
import { joinRel, normalizeRel, parentOf, readTextOrNull } from '../resolver/paths';
import {
  balanced,
  bracketDepth,
  indexOfTopLevel,
  splitKeyPath,
  splitTopLevelCommas,
  stringLiterals,
  stripTomlComment,
  unquote
} from '../resolver/toml';

describe('the four answers', () => {
  it('builds each one with the path only where a path means something', () => {
    expect(firstParty('src/a.ts')).toEqual({
      toPath: 'src/a.ts',
      resolution: 'first-party'
    });
    // THE THREE THAT CARRY NO PATH, and only two of them are failures. An
    // `external` is a definite answer, so the checker drops it from both sides
    // of the ledger; an `unresolved` withholds the verdict instead. That is the
    // distinction the whole feature is built on and it is why these are four
    // constructors rather than one with a flag.
    expect(external()).toEqual({ toPath: null, resolution: 'external' });
    expect(unresolved()).toEqual({ toPath: null, resolution: 'unresolved' });
    expect(unverifiable()).toEqual({ toPath: null, resolution: 'unverifiable' });
    expect(new Set([external(), unresolved(), unverifiable()].map((a) => a.resolution)).size).toBe(3);
  });
});

describe('the shared path pieces', () => {
  it('applies a `..` rather than dropping it, which is what the Ruby copy did not', () => {
    // The Gemfile reader carried a copy that skipped every `..` instead of
    // popping, so `a/../b` came back `a/b`, naming a directory that is not
    // there. The kept version is the one that pops.
    expect(normalizeRel('a/../b')).toBe('b');
    expect(normalizeRel('./a//b/')).toBe('a/b');
    expect(normalizeRel('a\\b')).toBe('a/b');
  });

  it('silently clamps a walk off the top, which is why a specifier must not use it', () => {
    // Stated in the module header and pinned here, because both the Python and
    // the Ruby arms count their own leading dots by hand for exactly this
    // reason. A manifest value cannot legally escape the repository; an import
    // specifier can, and clamping one would resolve `../../../etc/passwd`
    // against the repository root.
    expect(normalizeRel('../../x')).toBe('x');
  });

  it('answers the parent and the join', () => {
    expect(parentOf('a/b/c.rs')).toBe('a/b');
    expect(parentOf('top.rs')).toBe('');
    expect(joinRel('', 'a.rb')).toBe('a.rb');
    expect(joinRel('lib', 'a.rb')).toBe('lib/a.rb');
  });

  it('reads a manifest and answers null for one that is not there', () => {
    const dir = mkdtempSync(join(tmpdir(), 'gmux-p157-paths-'));
    try {
      writeFileSync(join(dir, 'ok.toml'), 'name = "x"\n');
      expect(readTextOrNull(join(dir, 'ok.toml'))).toBe('name = "x"\n');
      expect(readTextOrNull(join(dir, 'absent.toml'))).toBeNull();
      // A directory is not a file and must not throw out of a manifest read.
      expect(readTextOrNull(dir)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('the shared TOML lexer', () => {
  it('keeps a `#` inside a string, in both quote styles', () => {
    expect(stripTomlComment('name = "a#b" # tail')).toBe('name = "a#b" ');
    expect(stripTomlComment("name = 'a#b'")).toBe("name = 'a#b'");
    expect(stripTomlComment('# whole line')).toBe('');
  });

  it('understands `\\"`, which the Cargo copy did not and which was the one behaviour that moved', () => {
    // THE CORRECTION THE MERGE BOUGHT. Cargo's own stripper had no escape rule,
    // so a value holding an escaped quote around a `#` lost its tail and the
    // key after it was never read. The Python side's stripper had the rule, and
    // it is the one that survived.
    expect(stripTomlComment('d = "a \\"#\\" sign" # tail')).toBe(
      'd = "a \\"#\\" sign" '
    );
  });

  it('splits a dotted key outside quotes, which is what a Poetry dependency needs', () => {
    // Poetry writes `"ruamel.yaml" = "*"`. A naive split on every dot turns one
    // dependency into a table nobody reads, and that lost a real dependency in
    // the first build of the Python reader.
    expect(splitKeyPath('"ruamel.yaml"')).toEqual(['ruamel.yaml']);
    expect(splitKeyPath('tool.poetry.dependencies')).toEqual([
      'tool',
      'poetry',
      'dependencies'
    ]);
    expect(splitKeyPath("'a.b'.c")).toEqual(['a.b', 'c']);
    expect(unquote('"x"')).toBe('x');
    expect(unquote('x')).toBe('x');
  });

  it('reads string literals, commas and depth without tripping over quotes', () => {
    expect(stringLiterals('["a", \'b\', "c\\"d"]')).toEqual(['a', 'b', 'c"d']);
    expect(splitTopLevelCommas('"a,b", "c"')).toEqual(['"a,b"', ' "c"']);
    expect(bracketDepth('["a", ', 0)).toBe(1);
    expect(bracketDepth('"b"]', 1)).toBe(0);
    // A bracket inside a string is not a bracket.
    expect(bracketDepth('"a]b"', 0)).toBe(0);
  });

  it('finds the assignment outside quotes, brackets and braces', () => {
    expect(indexOfTopLevel('"a=b" = "c"', '=')).toBe(6);
    expect(indexOfTopLevel('x = { path = "y" }', '=')).toBe(2);
    expect(indexOfTopLevel('no assignment here', '=')).toBe(-1);
  });

  it('tells a finished value from one that runs onto the next line', () => {
    expect(balanced('["a", "b"]')).toBe(true);
    expect(balanced('["a",')).toBe(false);
    expect(balanced('"a]"')).toBe(true);
    expect(balanced('"unterminated')).toBe(false);
  });
});
