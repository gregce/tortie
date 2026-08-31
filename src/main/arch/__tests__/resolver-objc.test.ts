/**
 * The Objective-C arm, over a real Podfile on disk (Phase 180).
 *
 * The plain recipe under test: a quoted include is a file found the way the
 * toolchain finds it, a bracketed include is system by its own form unless a
 * tracked file shadows it, and `@import` resolves by module name against the
 * pods and the SDK. The last block is the false green control.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, resolveImport } from '../resolver';
import { readArchManifests } from '../resolver/manifest';

let root: string;

const FILES = [
  'Podfile',
  'mac/Renderer.m',
  'mac/Renderer.h',
  'mac/Deep/Utils.h',
  'other/Utils.h',
  'include/Lib/Lib.h'
];

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-objc-'));
  writeFileSync(
    join(root, 'Podfile'),
    [
      "platform :ios, '15.0'",
      "target 'App' do",
      "  pod 'AFNetworking', '~> 4.0'",
      "  pod 'Sub/Spec'",
      'end'
    ].join('\n')
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function ctx(): ReturnType<typeof archResolveContext> {
  return archResolveContext(readArchManifests(root), FILES);
}

describe('the Objective-C manifest reader', () => {
  it('reads the literal pod names, subspecs cut at the slash', () => {
    const objc = readArchManifests(root).objc;
    expect(objc.present).toBe(true);
    expect(objc.pods.has('AFNetworking')).toBe(true);
    expect(objc.pods.has('Sub')).toBe(true);
  });
});

describe('the Objective-C arm', () => {
  it('resolves a quoted include beside the importing file first', () => {
    expect(
      resolveImport('Renderer.h', 'mac/Renderer.m', 'objc', ctx())
    ).toEqual({ toPath: 'mac/Renderer.h', resolution: 'first-party' });
    expect(
      resolveImport('Deep/Utils.h', 'mac/Renderer.m', 'objc', ctx())
    ).toEqual({ toPath: 'mac/Deep/Utils.h', resolution: 'first-party' });
  });

  it('resolves a quoted include written from the repository root', () => {
    expect(
      resolveImport('mac/Renderer.h', 'other/Thing.m', 'objc', ctx())
    ).toEqual({ toPath: 'mac/Renderer.h', resolution: 'first-party' });
  });

  it('resolves a unique bare name anywhere, the header map way', () => {
    expect(
      resolveImport('Renderer.h', 'other/Thing.m', 'objc', ctx())
    ).toEqual({ toPath: 'mac/Renderer.h', resolution: 'first-party' });
  });

  it('answers unresolved for a name two headers share, never a coin flip', () => {
    expect(
      resolveImport('Utils.h', 'zed/Thing.m', 'objc', ctx())
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('lands the edge on the header named, never a paired implementation', () => {
    // The limit on the arm's face: Renderer.h is the answer, and nothing here
    // ever rewrites it to Renderer.m.
    const answer = resolveImport('Renderer.h', 'other/Thing.m', 'objc', ctx());
    expect(answer.toPath).toBe('mac/Renderer.h');
  });

  it('answers external for a bracketed include, the form is the declaration', () => {
    const c = ctx();
    expect(resolveImport('<Foundation/Foundation.h>', 'mac/Renderer.m', 'objc', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
    expect(resolveImport('<stdio.h>', 'mac/Renderer.m', 'objc', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
  });

  it('answers external for a bracketed include of a wholly undeclared framework, the ruling made executable', () => {
    // The Phase 180 fix-round ruling, stated in full above systemInclude's
    // final return: the bracket is the language's own outside-this-repository
    // declaration, the same authority node: carries, so an undeclared
    // framework behind it is external ON ITS FORM ALONE and never breaches
    // "unresolved NEVER external", which forbids downgrading a FAILURE. The
    // @import twin below keeps the opposite default, because a module NAME
    // declares nothing.
    expect(
      resolveImport('<Undeclared/Undeclared.h>', 'mac/Renderer.m', 'objc', ctx())
    ).toEqual({ toPath: null, resolution: 'external' });
  });

  it('answers unresolved for a bracketed include a tracked file shadows', () => {
    // include/Lib/Lib.h could be what <Lib/Lib.h> reaches through a header
    // search path, and calling it a dependency would hide a first party edge.
    expect(
      resolveImport('<Lib/Lib.h>', 'mac/Renderer.m', 'objc', ctx())
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('resolves @import by module name against the pods and the SDK', () => {
    const c = ctx();
    expect(resolveImport('AFNetworking', 'mac/Renderer.m', 'objc', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
    expect(resolveImport('UIKit', 'mac/Renderer.m', 'objc', c)).toEqual({
      toPath: null,
      resolution: 'external'
    });
    expect(resolveImport('Mystery', 'mac/Renderer.m', 'objc', c)).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });

  it('refuses an escape and anything that is not a plain path', () => {
    const c = ctx();
    for (const specifier of [
      '../../../../etc/passwd.h',
      '/usr/include/stdio.h',
      '<../escape.h>',
      '',
      'a b.h'
    ]) {
      expect(resolveImport(specifier, 'mac/Renderer.m', 'objc', c)).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    }
  });
});
