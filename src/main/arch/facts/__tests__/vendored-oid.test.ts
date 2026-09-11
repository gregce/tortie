/**
 * The vendor filter on planted bytes, and git's own blob name computed in
 * process (Phase 257).
 */

import { describe, expect, it } from 'vitest';
import { blobOid, sha256Hex } from '../oid';
import { vendoredReason } from '../vendored';

const SRC = Buffer.from("app.get('/x', h);\n");

describe('vendoredReason: the PATH half', () => {
  it('refuses the closed segment set and the two minified basenames, naming the half', () => {
    expect(vendoredReason('vendor/lib.js', SRC)).toBe('path: segment vendor');
    expect(vendoredReason('.yarn/releases/x.cjs', SRC)).toBe('path: segment .yarn');
    expect(vendoredReason('a/node_modules/b/c.js', SRC)).toBe('path: segment node_modules');
    expect(vendoredReason('build/vendor/specstory/x.js', SRC)).toBe('path: segment vendor');
    expect(vendoredReason('Carthage/Checkouts/x.swift', SRC)).toBe('path: segment Carthage/Checkouts');
    expect(vendoredReason('docs/jquery.min.js', SRC)).toBe('path: basename jquery.min.js');
    expect(vendoredReason('docs/x-min.js', SRC)).toBe('path: basename x-min.js');
  });

  it('reads a first party path as first party', () => {
    expect(vendoredReason('src/app.js', SRC)).toBeNull();
    expect(vendoredReason('build/electron-run.mjs', SRC)).toBeNull();
    expect(vendoredReason('src/vendored-thing.ts', SRC)).toBeNull();
    expect(vendoredReason('distribution/x.ts', SRC)).toBeNull();
  });
});

describe('vendoredReason: the BYTES half', () => {
  it('refuses a 2,000 byte line wherever it sits', () => {
    const minified = Buffer.from(`// a\n${'x'.repeat(2400)}\n`);
    expect(vendoredReason('assets/app.js', minified)).toBe('bytes: a line of 2400 bytes');
    expect(vendoredReason('assets/app.js', Buffer.from('x'.repeat(2000)))).toBe('bytes: a line of 2000 bytes');
    expect(vendoredReason('assets/app.js', Buffer.from(`${'x'.repeat(1999)}\n`))).toBeNull();
  });

  it('refuses a /*! banner or a sourceMappingURL with a 500 byte line, and nothing without one', () => {
    expect(vendoredReason('a.js', Buffer.from(`/*! lib v1 */\n${'y'.repeat(600)}\n`))).toBe('bytes: /*! banner with a line of 600 bytes');
    expect(vendoredReason('a.js', Buffer.from(`\n\n  /*! lib */\n${'y'.repeat(600)}\n`))).toBe('bytes: /*! banner with a line of 600 bytes');
    expect(vendoredReason('a.js', Buffer.from(`${'y'.repeat(600)}\n//# sourceMappingURL=a.map\n`))).toBe('bytes: sourceMappingURL with a line of 600 bytes');
    expect(vendoredReason('a.js', Buffer.from(`/*! lib */\n${'y'.repeat(400)}\n`))).toBeNull();
    expect(vendoredReason('a.js', Buffer.from(`/* not a bang */\n${'y'.repeat(600)}\n`))).toBeNull();
    expect(vendoredReason('a.js', Buffer.from(''))).toBeNull();
  });

  it('is the stated limit: a generated file with short lines and no banner reads first party', () => {
    expect(vendoredReason('gen/out.js', Buffer.from('a();\n'.repeat(1000)))).toBeNull();
  });
});

describe('blobOid', () => {
  it('is what `git hash-object` prints, over the length header and the bytes', () => {
    // `printf 'hello\n' | git hash-object --stdin` → ce013625030ba8dba906f756967f9e9ca394464a
    expect(blobOid(Buffer.from('hello\n'))).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
    // The empty blob every git repository knows.
    expect(blobOid(Buffer.alloc(0))).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
  });

  it('moves with one byte and is 40 hex', () => {
    const a = blobOid(Buffer.from('a'));
    expect(a).toMatch(/^[0-9a-f]{40}$/);
    expect(blobOid(Buffer.from('b'))).not.toBe(a);
  });

  it('sha256Hex of nothing is the constant the wrapper digest pins', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
