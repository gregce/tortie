/**
 * The one JSON-object column reader (Phase 42 stage 8).
 *
 * ./contract.ts and ./context-snapshot.ts carried byte-identical private
 * copies of `parseObject` until the stage merged them into ../json-column.
 * These cases pin the merged behavior: a manifest column that is NULL,
 * damaged, or the wrong JSON shape must read as "nothing was recorded",
 * never as a throw and never as a partial value.
 */

import { describe, expect, it } from 'vitest';
import { parseObject } from '../json-column';

describe('parseObject', () => {
  it('reads a JSON object', () => {
    expect(parseObject('{"a":1,"b":"x"}')).toEqual({ a: 1, b: 'x' });
  });

  it('reads an empty object', () => {
    expect(parseObject('{}')).toEqual({});
  });

  it('NULL column means undefined', () => {
    expect(parseObject(null)).toBeUndefined();
  });

  it('damaged JSON means undefined, not a throw', () => {
    expect(parseObject('{"a":')).toBeUndefined();
    expect(parseObject('')).toBeUndefined();
  });

  it('a JSON value that is not an object means undefined', () => {
    expect(parseObject('null')).toBeUndefined();
    expect(parseObject('[1,2]')).toBeUndefined();
    expect(parseObject('"text"')).toBeUndefined();
    expect(parseObject('7')).toBeUndefined();
  });
});
