/**
 * The Ruby arm (Phase 157).
 *
 * WHAT IT CLAIMS, AND IT IS THE WHOLE CLAIM. `require_relative "a/b"` written
 * in `x/y.rb` names the file `x/a/b.rb`, and that is the one Ruby shape that
 * resolves with certainty, because the language resolves it against the
 * requiring file's own directory and nothing else takes part. A bare
 * `require "a/b"` is a search of `$LOAD_PATH`, and `$LOAD_PATH` is assembled at
 * RUN TIME by the program itself, so this arm resolves a bare require only
 * through a load path root a gemspec actually declared. When no gemspec
 * declared one, the answer is `unresolved` and the reason is that the load path
 * is not knowable without running the repository, which this build never does.
 *
 * WHAT IT MAY NOT CLAIM. Module level resolution only. "Does `cask` require
 * from `utils`" is answerable. "Does `cask` use `Utils::Curl`" is not, and this
 * arm never pretends otherwise. A Ruby file that requires another file and
 * re-opens or re-exposes its constants resolves to THE FILE THAT WAS REQUIRED,
 * never to the file where the constant was finally defined, which is the same
 * limit the script arm states about a re-export chain. `autoload :Foo, "bar"`
 * is treated exactly as `require "bar"` is: it names the file that will be
 * loaded, not the place `Foo` ends up defined.
 *
 * THE RULE THAT GOVERNS EVERY BRANCH BELOW. An arm that cannot answer returns
 * `unresolved`, NEVER `external`. Phase 63's verifier caught the product
 * answering `external` when it had run out of ideas, and the cost is not a
 * wrong count: an `external` is dropped from both sides of the ledger by
 * src/main/arch/checkers/imports.ts, so a first party import wearing that
 * answer leaves a `must-not` promise across it GREEN. There are exactly two
 * ways `external` is reached in this file. Either a manifest this build read
 * named the gem, or the name is in Ruby's own standard library, and BOTH are
 * checked after the repository's own files have been given the chance to claim
 * the name. That last ordering is the shadow rule below and it exists so that a
 * repository's own `logger.rb` can never be reported as the platform's.
 *
 * WHAT IS NOT CAPTURED AT ALL, stated here because an import that never
 * arrives is the other way a promise stays green. The query in
 * src/main/symbols/queries.ts captures a require whose first argument is a
 * STRING LITERAL. A require whose argument is an expression, being
 * `require File.join(__dir__, "x")` or `require some_variable`, is not
 * captured, exactly as `require(someVariable)` is not captured in JavaScript.
 * Measured on Homebrew's own 1,864 Ruby files on 2026-08-26: 3,665 require,
 * require_relative and autoload lines, of which 10 have a non literal first
 * argument. That is 0.27 percent and it is a real hole rather than a rounding
 * error. An interpolated literal such as `require "#{dir}/x"` IS captured, and
 * it arrives here with its `#{` intact and answers `unresolved`, so it stays
 * counted rather than disappearing.
 *
 * NOTHING HERE SPAWNS ANYTHING. Every answer is set membership against the file
 * list the caller enumerated once with `git ls-files -z`, plus the gem names
 * and require paths read out of the root Gemfile and gemspecs. No specifier and
 * no manifest value ever reaches an argv.
 */

import {
  external,
  firstParty,
  unresolved,
  type ArchResolution
} from './answers';
import type { ArchResolveContext } from './index';
/**
 * WHAT THE SPINE HAS TO WIRE FOR THIS ARM, written here because none of it is
 * in this file and all of it is required for a `.rb` file to reach this arm at
 * all.
 *
 * 1. `ArchResolverLanguage` gains `'ruby'` and `RESOLVER_MATRIX` gains its row.
 * 2. `resolveImport` gains the FORM as a fifth argument and dispatches
 *    `if (language === 'ruby') return resolveRuby(specifier, fromPath, ctx,
 *    form === 'require-relative' ? 'require-relative' : 'require');`. The form
 *    is already on the extractor's own record at the one call site, being
 *    `found.form` in scan.ts. Without it a bare `require` and a
 *    `require_relative` are the same six letters and the arm answers one of
 *    them wrongly, which is the case this file's own header names.
 * 3. `languageOf` in scan.ts maps the `ruby` grammar to `'ruby'`. IT FALLS
 *    THROUGH TO `'typescript'` TODAY, so until that line lands every `.rb` file
 *    is resolved by the script arm, and `require "fs"` answers `external`
 *    because `fs` is a Node builtin. That is a false green waiting to happen
 *    and it is the single most important line of the three.
 */

/**
 * How the import was written, which is the one thing the specifier text cannot
 * tell this arm.
 *
 * `require "utils"` and `require_relative "utils"` are the same six letters and
 * they name different files: the first is a load path search and the second is
 * the requiring file's own neighbour. Homebrew holds both a root `utils.rb` and
 * a `cask/utils.rb`, so an arm that guessed between them would report a real
 * edge to the wrong file. The extractor knows which was written, so it is
 * passed rather than inferred.
 */
export type RubyImportShape = 'require' | 'require-relative';

/**
 * Ruby's own standard library and the default gems the interpreter ships,
 * matched on the FIRST SEGMENT, so `net/http` is `net` and `json/add/core` is
 * `json`.
 *
 * WHY A COMPILED IN LIST IS ALLOWED HERE when the rule above says a manifest
 * has to have said so. These are the language, not a dependency: no repository
 * declares `pathname` and every repository may require it, exactly as the
 * script arm answers `external` for `node:fs` out of Node's own
 * `builtinModules` rather than out of a package.json. The list is a language
 * fact and it is checked AFTER the shadow rule, so a repository that ships its
 * own file of the same name wins.
 */
const RUBY_STDLIB: ReadonlySet<string> = new Set([
  'abbrev', 'base64', 'benchmark', 'bigdecimal', 'bundler', 'cgi', 'continuation',
  'coverage', 'csv', 'date', 'dbm', 'debug', 'delegate', 'did_you_mean', 'digest',
  'drb', 'e2mmap', 'english', 'English', 'erb', 'etc', 'expect', 'fcntl', 'fiber',
  'fiddle', 'fileutils', 'find', 'forwardable', 'gdbm', 'getoptlong', 'io',
  'ipaddr', 'irb', 'json', 'logger', 'matrix', 'minitest', 'mkmf', 'monitor',
  'mutex_m', 'net', 'nkf', 'objspace', 'observer', 'open-uri', 'open3', 'openssl',
  'optparse', 'ostruct', 'pathname', 'power_assert', 'pp', 'prettyprint', 'prime',
  'pstore', 'psych', 'pty', 'racc', 'rake', 'rbconfig', 'rdoc', 'readline',
  'reline', 'resolv', 'resolv-replace', 'rexml', 'rinda', 'ripper', 'rss', 'ruby2_keywords',
  'rubygems', 'securerandom', 'set', 'shellwords', 'singleton', 'socket', 'stringio',
  'strscan', 'sync', 'syslog', 'tempfile', 'test-unit', 'thwait', 'time', 'timeout',
  'tmpdir', 'tracer', 'tsort', 'un', 'uri', 'weakref', 'webrick', 'yaml', 'zlib'
]);

/**
 * The characters a require path may be written with.
 *
 * Anything else is a specifier this arm will not read: an interpolation, an
 * escape sequence, a space, a quote that survived, or an expression that
 * reached here by some route the query does not yet know about. All of them
 * answer `unresolved`, which keeps them counted and keeps them out of every
 * definite answer below.
 */
const PLAIN_PATH = /^[A-Za-z0-9_.+\-/]+$/;

/** Every tracked `.rb` path, keyed by every suffix it could be reached by. */
const SUFFIX_INDEX = new WeakMap<ArchResolveContext, ReadonlySet<string>>();

/**
 * Resolve one Ruby import.
 *
 * `fromPath` is repository relative and is only ever used to walk a
 * `require_relative`. It is never handed to anything that runs.
 */
export function resolveRuby(
  specifier: string,
  fromPath: string,
  ctx: ArchResolveContext,
  shape: RubyImportShape
): ArchResolution {
  const spec = specifier.trim();
  if (spec.length === 0) return unresolved();
  if (!PLAIN_PATH.test(spec)) return unresolved();
  if (spec.startsWith('/')) {
    // An absolute path is not a repository relative path and this build will
    // not pretend to know what it names, the same answer the script arm gives.
    return unresolved();
  }
  if (shape === 'require-relative') return relative(spec, fromPath, ctx);
  return loadPath(spec, ctx);
}

/**
 * `require_relative`, the one shape that resolves with certainty.
 *
 * A path that walks above the repository root is `unresolved` rather than
 * clamped at the root. Clamping is what turns `../../../../../etc/passwd` into
 * `etc/passwd`, and a resolver that answered with a file it invented that way
 * would be reporting an edge that does not exist.
 */
function relative(
  spec: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  const base = joinWithin(parentOf(fromPath), spec);
  if (base === null) return unresolved();
  const hit = rubyFile(base, ctx);
  return hit === null ? unresolved() : firstParty(hit);
}

/**
 * A bare `require`, which in Ruby is a search of `$LOAD_PATH`.
 *
 * The order is the whole safety argument. The repository's own declared load
 * path roots are asked first, so a first party file wins whenever one is
 * findable. Then the shadow rule: if any tracked file COULD be this require
 * under a load path this build cannot see, the answer is grey, because calling
 * it a dependency would be the false green. Only after both does a definite
 * `external` become reachable, and only for a name the language ships or a gem
 * a manifest named.
 */
function loadPath(spec: string, ctx: ArchResolveContext): ArchResolution {
  for (const root of ctx.manifests.ruby.requirePaths) {
    const hit = rubyFile(root === '' ? spec : `${root}/${spec}`, ctx);
    if (hit !== null) return firstParty(hit);
  }
  if (spec.startsWith('./') || spec.startsWith('../')) {
    // Ruby resolves a relative bare require against the process's WORKING
    // DIRECTORY, not against the requiring file, and this build does not know
    // what directory the program will be run from.
    return unresolved();
  }
  if (shadowed(spec, ctx)) return unresolved();
  const head = spec.split('/')[0] ?? spec;
  if (RUBY_STDLIB.has(head)) return external();
  if (declaresGem(head, ctx)) return external();
  return unresolved();
}

/**
 * Could a file this repository tracks be what this bare require names?
 *
 * `require "utils"` in a repository that holds `cask/utils.rb` is answered grey
 * even though no declared load path found it, because the program may well put
 * `cask` on the load path at run time. Being grey about a file we can see is
 * the safe half of the trade; calling it a gem would hide a first party edge.
 */
function shadowed(spec: string, ctx: ArchResolveContext): boolean {
  return suffixIndex(ctx).has(`${spec}.rb`);
}

/** Every suffix of every tracked `.rb` path, built once per scan context. */
function suffixIndex(ctx: ArchResolveContext): ReadonlySet<string> {
  const cached = SUFFIX_INDEX.get(ctx);
  if (cached !== undefined) return cached;
  const index = new Set<string>();
  for (const path of ctx.files) {
    if (!path.endsWith('.rb')) continue;
    index.add(path);
    let cut = path.indexOf('/');
    while (cut !== -1) {
      index.add(path.slice(cut + 1));
      cut = path.indexOf('/', cut + 1);
    }
  }
  SUFFIX_INDEX.set(ctx, index);
  return index;
}

/**
 * Did a manifest this build read name this gem?
 *
 * A gem's name and the name it is required by differ by a hyphen often enough
 * to be worth handling, being `did_you_mean` against `did-you-mean`, so both
 * spellings are tried. Nothing beyond that is inferred: `activesupport` against
 * `active_support` is a mapping Rails invented and no manifest states it, so a
 * repository that only declares `activesupport` leaves `require
 * "active_support"` grey.
 */
function declaresGem(head: string, ctx: ArchResolveContext): boolean {
  const gems = ctx.manifests.ruby.gems;
  if (gems.has(head)) return true;
  if (gems.has(head.split('_').join('-'))) return true;
  return gems.has(head.split('-').join('_'));
}

/** The tracked `.rb` file a base path names, or null. */
function rubyFile(base: string, ctx: ArchResolveContext): string | null {
  if (base === '') return null;
  if (base.endsWith('.rb') && ctx.files.has(base)) return base;
  const withExtension = `${base}.rb`;
  return ctx.files.has(withExtension) ? withExtension : null;
}

/**
 * Join a relative specifier onto a directory, or null when it walks out of the
 * repository. `normalizeRel` is deliberately not used here: it drops a `..`
 * that has nothing left to pop, which turns an escape into a path inside the
 * repository.
 */
function joinWithin(dir: string, spec: string): string | null {
  const parts = dir === '' ? [] : dir.split('/');
  for (const segment of spec.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (parts.length === 0) return null;
      parts.pop();
      continue;
    }
    parts.push(segment);
  }
  return parts.join('/');
}

function parentOf(path: string): string {
  const cut = path.lastIndexOf('/');
  return cut === -1 ? '' : path.slice(0, cut);
}
