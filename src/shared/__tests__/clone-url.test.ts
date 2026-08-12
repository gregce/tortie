/**
 * The eleven URL rules (Phase 18.6, research 35 §3.4).
 *
 * The table below is git's own behaviour, measured with `git ls-remote` on
 * 2026-08-12: four of the nine forms a person realistically pastes are
 * refused by git if they are passed straight through. Each case here names
 * which of those it is, so a later edit that "simplifies" a rule fails on
 * the form it was written for.
 */

import { describe, expect, it } from 'vitest';
import { normalizeCloneUrl } from '../clone-url';

/** The resolved address for a string, or null. */
function url(raw: string): string | null {
  return normalizeCloneUrl(raw)?.url ?? null;
}

describe('normalising a pasted repository address', () => {
  it('leaves the three forms git already accepts pointing at the same place', () => {
    expect(url('https://github.com/o/r.git')).toBe('https://github.com/o/r.git');
    expect(url('https://github.com/o/r')).toBe('https://github.com/o/r.git');
    expect(url('https://github.com/o/r/')).toBe('https://github.com/o/r.git');
  });

  it('rule 1 — trims the newline a paste carries', () => {
    expect(url('  https://github.com/o/r.git \n')).toBe(
      'https://github.com/o/r.git'
    );
  });

  it('rule 2 — expands owner/repo to GitHub, and does not double the suffix', () => {
    expect(url('sindresorhus/got')).toBe(
      'https://github.com/sindresorhus/got.git'
    );
    expect(url('sindresorhus/got.git')).toBe(
      'https://github.com/sindresorhus/got.git'
    );
  });

  it('rule 3 — rewrites the scp form to https and drops the username', () => {
    const target = normalizeCloneUrl('git@github.com:o/r.git');
    expect(target?.url).toBe('https://github.com/o/r.git');
    expect(target?.rewrittenFromSsh).toBe(true);
  });

  it('rule 4 — rewrites ssh:// and git:// the same way', () => {
    expect(normalizeCloneUrl('ssh://git@github.com/o/r.git')?.url).toBe(
      'https://github.com/o/r.git'
    );
    expect(normalizeCloneUrl('git://github.com/o/r.git')?.rewrittenFromSsh).toBe(
      true
    );
  });

  it('rule 5 — a bare host and path gets https, which git reads as a local path without it', () => {
    expect(url('github.com/o/r')).toBe('https://github.com/o/r.git');
  });

  it('rule 6 — refuses anything that is not http or https, and file: by name', () => {
    expect(normalizeCloneUrl('file:///Users/me/repo')).toBeNull();
    expect(normalizeCloneUrl('/Users/me/repo')).toBeNull();
    expect(normalizeCloneUrl('not a url')).toBeNull();
    expect(normalizeCloneUrl('')).toBeNull();
  });

  it('rule 7 — drops the query and the fragment, which git cannot read', () => {
    expect(url('https://github.com/o/r.git?x=1#y')).toBe(
      'https://github.com/o/r.git'
    );
  });

  it('rule 9 — cuts a web page suffix, on GitHub and on GitLab', () => {
    expect(url('https://github.com/o/r/tree/main')).toBe(
      'https://github.com/o/r.git'
    );
    expect(url('https://github.com/o/r/pull/42')).toBe(
      'https://github.com/o/r.git'
    );
    expect(url('https://gitlab.com/group/sub/proj/-/tree/main')).toBe(
      'https://gitlab.com/group/sub/proj.git'
    );
  });

  it('rule 9 — never cuts a repository that is itself called tree', () => {
    expect(url('https://github.com/o/tree')).toBe('https://github.com/o/tree.git');
  });

  it('rule 10 — removes a password, and says that it did', () => {
    const target = normalizeCloneUrl('https://user:ghp_secret@github.com/o/r.git');
    expect(target?.url).toBe('https://github.com/o/r.git');
    expect(target?.url).not.toContain('ghp_secret');
    expect(target?.strippedCredential).toBe(true);
  });

  it('names the folder, the owner and the repo', () => {
    const target = normalizeCloneUrl('https://github.com/sindresorhus/got');
    expect(target?.suggestedName).toBe('got');
    expect(target?.owner).toBe('sindresorhus');
    expect(target?.repo).toBe('got');
    expect(target?.host).toBe('github.com');
  });

  it('handles a self hosted host with a one segment path', () => {
    const target = normalizeCloneUrl('https://git.example.com/thing');
    expect(target?.url).toBe('https://git.example.com/thing.git');
    expect(target?.suggestedName).toBe('thing');
    expect(target?.owner).toBeUndefined();
  });

  it('is idempotent, because main normalises again what preflight resolved', () => {
    const once = normalizeCloneUrl('git@github.com:o/r')?.url ?? '';
    expect(url(once)).toBe(once);
  });
});
