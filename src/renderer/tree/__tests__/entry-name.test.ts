/**
 * The naming rules for a new file or folder (Phase 37), pinned message by
 * message: the inline editor's refusal and main's own refusal must say the
 * same thing, so the EXACT strings are part of the contract.
 */

import { describe, expect, it } from 'vitest';
import { entryNameVerdict, MAX_ENTRY_NAME } from '../entry-name';

const none: ReadonlySet<string> = new Set();

function reasonOf(raw: string, taken: ReadonlySet<string> = none): string {
  const verdict = entryNameVerdict(raw, taken);
  if (verdict.kind !== 'bad') {
    throw new Error(`expected bad, got ${verdict.kind} for ${JSON.stringify(raw)}`);
  }
  return verdict.reason;
}

describe('empty is a dismissal, never an error', () => {
  it('returns empty for nothing and for whitespace', () => {
    expect(entryNameVerdict('', none)).toEqual({ kind: 'empty' });
    expect(entryNameVerdict('   ', none)).toEqual({ kind: 'empty' });
    expect(entryNameVerdict('\t', none)).toEqual({ kind: 'empty' });
  });
});

describe('the refusals, with their exact messages', () => {
  it('refuses a separator', () => {
    expect(reasonOf('a/b')).toBe('A name cannot contain "/".');
    expect(reasonOf('/')).toBe('A name cannot contain "/".');
    expect(reasonOf('trailing/')).toBe('A name cannot contain "/".');
  });

  it('refuses the two directory aliases', () => {
    expect(reasonOf('.')).toBe('"." is not a usable name.');
    expect(reasonOf('..')).toBe('".." is not a usable name.');
  });

  it('refuses control characters, NUL and DEL', () => {
    const message = 'That name contains characters a file name cannot hold.';
    expect(reasonOf('a\u0000b')).toBe(message);
    expect(reasonOf('a\nb')).toBe(message);
    expect(reasonOf('a\u001Fb')).toBe(message);
    expect(reasonOf('a\u007Fb')).toBe(message);
  });

  it('refuses the protected .git name', () => {
    expect(reasonOf('.git')).toBe('Tortie does not touch the .git folder.');
  });

  it('refuses a name longer than the filesystem holds', () => {
    expect(reasonOf('x'.repeat(MAX_ENTRY_NAME + 1))).toBe(
      'That name is too long.'
    );
    expect(entryNameVerdict('x'.repeat(MAX_ENTRY_NAME), none)).toEqual({
      kind: 'ok',
      name: 'x'.repeat(MAX_ENTRY_NAME)
    });
  });

  it('refuses a sibling collision, case-insensitively, naming the input', () => {
    const taken = new Set(['note.md']);
    expect(reasonOf('note.md', taken)).toBe('"note.md" already exists here.');
    expect(reasonOf('NOTE.md', taken)).toBe('"NOTE.md" already exists here.');
    expect(reasonOf('  note.md  ', taken)).toBe(
      '"note.md" already exists here.'
    );
  });

  it('checks in order: the separator wins over the duplicate', () => {
    const taken = new Set(['a/b']);
    expect(reasonOf('a/b', taken)).toBe('A name cannot contain "/".');
  });
});

describe('what the disk allows, this module allows', () => {
  it('passes dotfiles, spaces, backslash and unicode', () => {
    expect(entryNameVerdict('.env', none)).toEqual({
      kind: 'ok',
      name: '.env'
    });
    expect(entryNameVerdict('name with space', none)).toEqual({
      kind: 'ok',
      name: 'name with space'
    });
    expect(entryNameVerdict('back\\slash', none)).toEqual({
      kind: 'ok',
      name: 'back\\slash'
    });
    expect(entryNameVerdict('café.txt', none)).toEqual({
      kind: 'ok',
      name: 'café.txt'
    });
  });

  it('hands back the trimmed name', () => {
    expect(entryNameVerdict('  keep.md  ', none)).toEqual({
      kind: 'ok',
      name: 'keep.md'
    });
  });
});
