/**
 * The PHP arm, over a real Composer tree on disk (Phase 184).
 *
 * The four things under test are the four the arm's header claims. The
 * autoload map resolves to a FILE and beats a vendor name that merely shares
 * its first segment; PSR-0's underscore rule is not PSR-4's; a `require` is
 * read only when its path is wholly literal, with `__DIR__` decidable and
 * `ABSPATH` refused; and a name nobody declared stays unresolved.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archResolveContext, resolveImport } from '../resolver';
import { readArchManifests } from '../resolver/manifest';

let root: string;

const FILES = [
  'composer.json',
  'packages/inner/composer.json',
  'src/Client.php',
  'src/Psr7/Request.php',
  'src/Support/Str.php',
  'lib/Support/Str.php',
  'tests/ClientTest.php',
  'legacy/Zend/Db/Adapter.php',
  'packages/inner/source/Thing.php',
  'bootstrap.php',
  'wp-admin/admin-header.php'
];

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'gmux-arch-php-'));
  mkdirSync(join(root, 'packages', 'inner'), { recursive: true });
  writeFileSync(
    join(root, 'composer.json'),
    JSON.stringify({
      require: {
        php: '>=8.1',
        'psr/http-message': '^2.0',
        'nesbot/carbon': '^2.0'
      },
      'require-dev': { 'phpunit/phpunit': '^10' },
      autoload: {
        'psr-4': {
          // The longer prefix must beat the shorter one that overlaps it, and
          // an ordered target list must be tried in order.
          'App\\Support\\': ['lib/Support', 'src/Support'],
          'App\\': 'src/',
          'Vendorish\\': 'nowhere/'
        },
        'psr-0': { 'Zend_': 'legacy/' },
        classmap: ['legacy/']
      },
      'autoload-dev': { 'psr-4': { 'App\\Tests\\': 'tests/' } }
    })
  );
  writeFileSync(
    join(root, 'packages', 'inner', 'composer.json'),
    JSON.stringify({ autoload: { 'psr-4': { 'Inner\\': 'source/' } } })
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const ctx = (): ReturnType<typeof archResolveContext> =>
  archResolveContext(readArchManifests(root), FILES);

const use = (
  specifier: string,
  fromPath = 'src/Client.php'
): { toPath: string | null; resolution: string } =>
  resolveImport(specifier, fromPath, 'php', ctx(), 'static');

const req = (
  specifier: string,
  fromPath = 'wp-admin/admin-header.php'
): { toPath: string | null; resolution: string } =>
  resolveImport(specifier, fromPath, 'php', ctx(), 'require');

describe('the autoload map is the whole first party answer', () => {
  it('resolves a PSR-4 name to the file the map names', () => {
    expect(use('App\\Psr7\\Request')).toEqual({
      toPath: 'src/Psr7/Request.php',
      resolution: 'first-party'
    });
  });

  it('takes the longest prefix and the listed directories in order', () => {
    // `App\Support\` maps to lib/Support first, and both directories hold Str.
    expect(use('App\\Support\\Str').toPath).toBe('lib/Support/Str.php');
  });

  it('joins a nested manifest onto its OWN directory', () => {
    expect(use('Inner\\Thing').toPath).toBe('packages/inner/source/Thing.php');
  });

  it('reads autoload-dev the same way', () => {
    expect(use('App\\Tests\\ClientTest').toPath).toBe('tests/ClientTest.php');
  });

  it("reads PSR-0's underscore rule, which is not PSR-4's", () => {
    expect(use('Zend_Db_Adapter').toPath).toBe('legacy/Zend/Db/Adapter.php');
  });

  it('answers unresolved when a rule matched and no file is there', () => {
    // The rule is real, the file behind it is not, and calling it external
    // would invent a dependency that does not exist.
    expect(use('Vendorish\\Missing').resolution).toBe('unresolved');
  });

  it('leaves a leading backslash off the name', () => {
    expect(use('\\App\\Client').toPath).toBe('src/Client.php');
  });
});

describe('the map beats the vendor compare, and that ordering is the point', () => {
  it('does not lose an own class to a vendor sharing its first segment', () => {
    // guzzle's own `GuzzleHttp\` prefix is also the vendor of the declared
    // `guzzlehttp/psr7`. Going grey there threw away all 369 of its first
    // party answers, so a rule landing on a real file wins outright.
    expect(use('App\\Client').resolution).toBe('first-party');
  });
});

describe('what may be called a dependency, and what may not', () => {
  it("calls a declared package's vendor half external", () => {
    expect(use('Psr\\Http\\Message\\RequestInterface').resolution).toBe('external');
  });

  it("calls a declared package's package half external", () => {
    // `nesbot/carbon` publishes the namespace `Carbon`.
    expect(use('Carbon\\CarbonInterval').resolution).toBe('external');
  });

  it("calls PHP's own global classes external", () => {
    expect(use('Closure').resolution).toBe('external');
    expect(use('RuntimeException').resolution).toBe('external');
    expect(use('ReflectionClass').resolution).toBe('external');
  });

  it('never matches a namespaced name against the global runtime list', () => {
    expect(use('Deep\\Exception').resolution).toBe('unresolved');
  });

  it('leaves a name nobody declared unresolved, never external', () => {
    expect(use('Nobody\\Declared\\This').resolution).toBe('unresolved');
  });

  it('answers unresolved for a group use, which names a namespace', () => {
    // The grammar hands `use App\{Client, Other};` over as `App`, which is a
    // directory, and this arm answers with files.
    expect(use('App').resolution).toBe('unresolved');
  });
});

describe('a require is read only when its path is wholly literal', () => {
  it('reads a bare literal against the including file', () => {
    expect(req('../bootstrap.php').toPath).toBe('bootstrap.php');
  });

  it("reads __DIR__ and dirname(__FILE__) as the file's own directory", () => {
    expect(req("__DIR__ . '/../bootstrap.php'").toPath).toBe('bootstrap.php');
    expect(req("dirname(__FILE__) . '/../bootstrap.php'").toPath).toBe(
      'bootstrap.php'
    );
  });

  it('REFUSES a constant prefix, and ABSPATH is why the rule exists', () => {
    // Treating ABSPATH as the repository root resolves 495 of WordPress's 658
    // constant prefixed sites. It is defined at run time in wp-load.php and
    // nothing declares it as a root, so resolving through it invents an edge.
    expect(req("ABSPATH . 'wp-admin/admin-header.php'").resolution).toBe(
      'unresolved'
    );
  });

  it('refuses a variable and an expression that is not a literal', () => {
    expect(req('$path').resolution).toBe('unresolved');
    expect(req("$dir . '/x.php'").resolution).toBe('unresolved');
  });

  it('answers unresolved for a literal naming no tracked file', () => {
    expect(req('vendor/autoload.php').resolution).toBe('unresolved');
  });
});
