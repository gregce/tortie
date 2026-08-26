/**
 * The field checks, and the six path refusals that are half of the argv
 * defense (Phase 63).
 *
 * Every one of these is a case where a value out of a file that arrived with a
 * `git pull` would otherwise reach code that spawns git. The check that stops
 * it is here, at the format layer, before the value is ever stored.
 */

import { describe, expect, it } from 'vitest';
import {
  ArchRowError,
  dayField,
  enumField,
  globField,
  idField,
  intField,
  oidField,
  pathField,
  plainString,
  unknownKeys
} from '../schema';

/** Run a check and hand back the problem it threw, or null when it passed. */
function refused(run: () => unknown): { field: string; message: string } | null {
  try {
    run();
    return null;
  } catch (err) {
    if (err instanceof ArchRowError) return { field: err.field, message: err.message };
    throw err;
  }
}

describe('pathField', () => {
  it('refuses a leading hyphen and says why git cares', () => {
    const problem = refused(() => pathField('-upload-pack=touch', 'anchors[0]'));
    expect(problem?.field).toBe('anchors[0]');
    expect(problem?.message).toContain('starts with a hyphen');
    expect(problem?.message).toContain('git reads');
  });

  it('refuses a leading slash', () => {
    expect(refused(() => pathField('/etc/passwd', 'p'))?.message).toContain(
      'starts with a slash'
    );
  });

  it('refuses a leading tilde', () => {
    expect(refused(() => pathField('~/.ssh/id_ed25519', 'p'))?.message).toContain(
      'starts with a tilde'
    );
  });

  it('refuses a step back up out of the repository', () => {
    expect(refused(() => pathField('src/../../etc/passwd', 'p'))?.message).toContain(
      'step back up out of the repository'
    );
  });

  it('refuses a backslash', () => {
    expect(refused(() => pathField('src\\main', 'p'))?.message).toContain('backslash');
  });

  it('refuses a control character, because cat-file reads one request per line', () => {
    const problem = refused(() => pathField('src/main\nHEAD:/etc/passwd', 'p'));
    expect(problem?.message).toContain('control character');
  });

  it('refuses a wildcard where one exact file is meant, and allows one in a glob', () => {
    expect(refused(() => pathField('src/**/x.ts', 'p'))?.message).toContain('wildcard');
    expect(globField('src/**/x.ts', 'p')).toBe('src/**/x.ts');
  });

  it('refuses a wildcard bomb, and lets an ordinary pattern through', () => {
    // The anchor that took a measured 33 seconds against ONE path under the
    // first build's regular expression matcher. It satisfies every other path
    // rule, which is why the ceiling has to be its own refusal.
    const bomb = refused(() => globField('**a'.repeat(9) + 'zz', 'component.anchors[0]'));
    expect(bomb?.field).toBe('component.anchors[0]');
    expect(bomb?.message).toContain('9 wildcards');
    expect(bomb?.message).toContain('at most 8');
    expect(globField('src/**/*.ts', 'p')).toBe('src/**/*.ts');
    expect(globField('src/*/?/**/a*b?c', 'p')).toBe('src/*/?/**/a*b?c');
  });

  it('accepts an ordinary repository relative path', () => {
    expect(pathField('src/main/arch/schema.ts', 'p')).toBe('src/main/arch/schema.ts');
  });
});

describe('oidField', () => {
  it('accepts exactly forty lower case hex characters', () => {
    const oid = '0123456789abcdef0123456789abcdef01234567';
    expect(oidField(oid, 'blobOid')).toBe(oid);
  });

  it('refuses anything else, and names the reason', () => {
    for (const bad of [
      '--upload-pack=touch',
      'HEAD',
      '0123456789ABCDEF0123456789abcdef01234567',
      '0123456789abcdef0123456789abcdef0123456'
    ]) {
      const problem = refused(() => oidField(bad, 'blobOid'));
      expect(problem, `it accepted ${bad}`).not.toBeNull();
      expect(problem?.message).toContain('not an object name');
    }
  });
});

describe('the small checks', () => {
  it('idField takes kebab case and refuses a leading digit', () => {
    expect(idField('scm-no-terminal', 'id')).toBe('scm-no-terminal');
    expect(refused(() => idField('2fast', 'id'))?.message).toContain('not a usable id');
  });

  it('plainString refuses a control character anywhere', () => {
    expect(refused(() => plainString('a\u0007b', 'q', 20))?.message).toContain(
      'control character'
    );
  });

  it('intField and enumField name the bound they refused', () => {
    expect(refused(() => intField(0, 'lineStart', 1, 10))?.message).toContain(
      'between 1 and 10'
    );
    expect(
      refused(() => enumField('sideways', 'rule', ['must', 'may'] as const))?.message
    ).toContain('must be one of must, may');
  });

  it('dayField takes a written day and nothing else', () => {
    expect(dayField('2026-08-25', 'at')).toBe('2026-08-25');
    expect(refused(() => dayField('yesterday', 'at'))).not.toBeNull();
  });

  it('unknownKeys reports what it does not know and drops nothing', () => {
    expect(unknownKeys({ id: 'a', command: 'rm -rf /' }, ['id'])).toEqual(['command']);
  });
});
