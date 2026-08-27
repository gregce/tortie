/**
 * The Ruby arm, over real manifests on disk (Phase 157).
 *
 * The file is organised around the one distinction the whole design rests on.
 * `external` is a definite answer and `unresolved` is the absence of one, and
 * the checkers drop an `external` from both sides of the ledger, so an arm that
 * answered `external` when it had run out of ideas would leave a `must-not`
 * promise across a first party import GREEN. Every case below that ends in
 * `unresolved` is there to hold that line, and the two that end in `external`
 * name the manifest or the language fact that earned it.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext } from '../resolver';
import { readArchManifests } from '../resolver/manifest';
import { readRubyManifest } from '../resolver/gemfile';
import { resolveRuby } from '../resolver/ruby';

/**
 * A repository with both shapes of the same name in it, which is the case that
 * makes `require` and `require_relative` different questions rather than two
 * spellings of one. Homebrew has exactly this pair.
 */
const FILES = [
  'Gemfile',
  'fixture.gemspec',
  'lib/fixture.rb',
  'lib/fixture/version.rb',
  'lib/fixture/cache/store.rb',
  'utils.rb',
  'cask/cmd.rb',
  'cask/utils.rb',
  'logger.rb',
  'spec/cmd_spec.rb'
];

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-ruby-'));
  mkdirSync(join(root, 'lib', 'fixture'), { recursive: true });
  writeFileSync(
    join(root, 'Gemfile'),
    [
      'source "https://rubygems.org"',
      '',
      'gemspec',
      'gem "rake", "~> 13.0"',
      'group :test do',
      '  gem "rspec"',
      'end',
      '# gem "commented_out"'
    ].join('\n')
  );
  writeFileSync(
    join(root, 'fixture.gemspec'),
    [
      'Gem::Specification.new do |spec|',
      '  spec.name = "fixture"',
      '  spec.require_paths = ["lib"]',
      '  spec.add_dependency "ethon", ">= 0.9.0"',
      '  spec.add_development_dependency "rspec-its"',
      'end'
    ].join('\n')
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

function ctx() {
  return archResolveContext(readArchManifests(root), FILES);
}

describe('the Ruby manifests', () => {
  it('reads the gem names out of the Gemfile without evaluating it', () => {
    const manifest = readRubyManifest(root);
    expect([...manifest.gems].sort()).toEqual([
      'ethon',
      'rake',
      'rspec',
      'rspec-its'
    ]);
    // An anchored match is what keeps a commented out line from declaring a gem.
    expect(manifest.gems.has('commented_out')).toBe(false);
  });

  it('takes the load path roots from the gemspec and nowhere else', () => {
    expect(readRubyManifest(root).requirePaths).toEqual(['lib']);
    const bare = mkdtempSync(join(tmpdir(), 'gmux-arch-ruby-bare-'));
    try {
      // No Gemfile and no gemspec means no load path is knowable, and the
      // reader says so instead of assuming `lib`.
      expect(readRubyManifest(bare)).toEqual({
        gems: new Set(),
        requirePaths: [],
        present: false
      });
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});

describe('require_relative, the shape that resolves', () => {
  it('resolves against the requiring file own directory', () => {
    expect(resolveRuby('utils', 'cask/cmd.rb', ctx(), 'require-relative')).toEqual({
      toPath: 'cask/utils.rb',
      resolution: 'first-party'
    });
  });

  it('walks up inside the repository', () => {
    expect(
      resolveRuby('../utils', 'cask/cmd.rb', ctx(), 'require-relative')
    ).toEqual({ toPath: 'utils.rb', resolution: 'first-party' });
    expect(
      resolveRuby('../version', 'lib/fixture/cache/store.rb', ctx(), 'require-relative')
    ).toEqual({ toPath: 'lib/fixture/version.rb', resolution: 'first-party' });
  });

  it('accepts the extension when the author wrote it', () => {
    expect(
      resolveRuby('utils.rb', 'cask/cmd.rb', ctx(), 'require-relative')
    ).toEqual({ toPath: 'cask/utils.rb', resolution: 'first-party' });
  });

  it('answers unresolved for a file that is not there, never external', () => {
    expect(
      resolveRuby('missing', 'cask/cmd.rb', ctx(), 'require-relative')
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });
});

describe('the shapes a hostile file can hold', () => {
  it('refuses a path that walks out of the repository rather than clamping it', () => {
    // Clamping is what turns this into `etc/passwd`, which is a file the
    // resolver would have invented.
    expect(
      resolveRuby('../../../../../etc/passwd', 'cask/cmd.rb', ctx(), 'require-relative')
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('refuses an absolute path in either shape', () => {
    expect(resolveRuby('/etc/passwd', 'cask/cmd.rb', ctx(), 'require')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
    expect(
      resolveRuby('/etc/passwd', 'cask/cmd.rb', ctx(), 'require-relative')
    ).toEqual({ toPath: null, resolution: 'unresolved' });
  });

  it('counts an interpolated specifier and resolves none of it', () => {
    for (const spec of ['#{dir}/utils', '#{__dir__}/cask/utils']) {
      expect(resolveRuby(spec, 'cask/cmd.rb', ctx(), 'require-relative')).toEqual({
        toPath: null,
        resolution: 'unresolved'
      });
    }
  });

  it('refuses a specifier holding anything but a plain path', () => {
    for (const spec of ['with space', 'tab\\there', 'File.join(__dir__)', '%q(x)']) {
      expect(resolveRuby(spec, 'cask/cmd.rb', ctx(), 'require').resolution).toBe(
        'unresolved'
      );
    }
  });

  it('answers unresolved for a name that starts with a dash', () => {
    // A leading dash is legal in the string and names nothing this repository
    // holds, and no manifest names it either. It must not become a dependency.
    expect(resolveRuby('-weird', 'cask/cmd.rb', ctx(), 'require')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });

  it('answers unresolved for a relative bare require, which Ruby reads from the working directory', () => {
    expect(resolveRuby('./utils', 'cask/cmd.rb', ctx(), 'require')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });
});

describe('a bare require, which is a load path search', () => {
  it('resolves through a load path root the gemspec declared', () => {
    expect(resolveRuby('fixture/version', 'spec/cmd_spec.rb', ctx(), 'require')).toEqual({
      toPath: 'lib/fixture/version.rb',
      resolution: 'first-party'
    });
    expect(resolveRuby('fixture', 'spec/cmd_spec.rb', ctx(), 'require')).toEqual({
      toPath: 'lib/fixture.rb',
      resolution: 'first-party'
    });
  });

  it('is external for a gem the Gemfile or the gemspec named', () => {
    for (const gem of ['rake', 'rspec', 'ethon']) {
      expect(resolveRuby(gem, 'spec/cmd_spec.rb', ctx(), 'require').resolution).toBe(
        'external'
      );
    }
    // The hyphen and the underscore are the same gem to a person writing the
    // require, so both spellings are tried.
    expect(
      resolveRuby('rspec_its', 'spec/cmd_spec.rb', ctx(), 'require').resolution
    ).toBe('external');
  });

  it('is external for the language own standard library', () => {
    for (const name of ['pathname', 'net/http', 'json/add/core']) {
      expect(resolveRuby(name, 'cask/cmd.rb', ctx(), 'require').resolution).toBe(
        'external'
      );
    }
  });

  it('IS NOT EXTERNAL for a name nothing declared, which is the whole rule', () => {
    // `activesupport` is a real gem and this repository never named it. Calling
    // it a dependency would be answering definitely because we ran out of
    // ideas, and a `must-not` promise across it would go green.
    expect(resolveRuby('active_support', 'cask/cmd.rb', ctx(), 'require')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });

  it('goes grey rather than external when a tracked file could be the thing required', () => {
    // `logger` is in Ruby's standard library AND this repository ships
    // `logger.rb`. The program may well put the root on its load path at run
    // time, so the honest answer is grey. This is the shadow rule and it is
    // what stops the standard library list producing a false green.
    expect(resolveRuby('logger', 'cask/cmd.rb', ctx(), 'require')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
    // Same for a first party file no declared load path root reaches.
    expect(resolveRuby('cask/utils', 'lib/fixture.rb', ctx(), 'require')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });

  it('reads require and require_relative as different questions', () => {
    // The pair that makes the form worth carrying: one names the neighbour and
    // the other names a file the load path may reach, and they are the same
    // five letters.
    expect(resolveRuby('utils', 'cask/cmd.rb', ctx(), 'require-relative').toPath).toBe(
      'cask/utils.rb'
    );
    expect(resolveRuby('utils', 'cask/cmd.rb', ctx(), 'require').toPath).toBe(null);
  });

  it('resolves each hop of a chain to the file that was required, never past it', () => {
    // Ruby's answer to a re-export chain. `lib/fixture.rb` requires
    // `fixture/version`, which requires `fixture/cache/store`. Each hop is one
    // edge to the file NAMED, and the arm never claims to know where a constant
    // that travels the chain was finally defined. That is the limit on the
    // arm's face, made executable.
    const c = ctx();
    expect(resolveRuby('fixture/version', 'lib/fixture.rb', c, 'require').toPath).toBe(
      'lib/fixture/version.rb'
    );
    expect(
      resolveRuby('fixture/cache/store', 'lib/fixture/version.rb', c, 'require').toPath
    ).toBe('lib/fixture/cache/store.rb');
    expect(
      resolveRuby('cache/store', 'lib/fixture/version.rb', c, 'require-relative').toPath
    ).toBe('lib/fixture/cache/store.rb');
  });

  it('answers unresolved for an empty specifier', () => {
    expect(resolveRuby('', 'cask/cmd.rb', ctx(), 'require')).toEqual({
      toPath: null,
      resolution: 'unresolved'
    });
  });
});
