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
  'shared-src/Kit/Real.php',
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
        'nesbot/carbon': '^2.0',
        // The Phase 184 fix round's shape: a declared package whose VENDOR
        // half is also the head of one of this repository's own prefixes.
        'shared/kit': '^1.0'
      },
      'require-dev': { 'phpunit/phpunit': '^10' },
      autoload: {
        'psr-4': {
          // The longer prefix must beat the shorter one that overlaps it, and
          // an ordered target list must be tried in order.
          'App\\Support\\': ['lib/Support', 'src/Support'],
          'App\\': 'src/',
          'Shared\\': 'shared-src/',
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

describe('a prefix this repository declared is never somebody else\'s', () => {
  // THE PHASE 184 FIX ROUND. `Shared\` is one of this repository's own
  // autoload prefixes AND `shared` is the vendor half of the declared
  // `shared/kit`, which is the shape nearly every PHP library has. Before the
  // fix a prefix that matched and landed on no file fell through to the vendor
  // head compare, so 7,418 of sebastianbergmann/phpunit's 11,638 `use`
  // statements, being 63.7 percent, called that repository's own classes a
  // dependency, and a must-not 132 of them cross printed convergent.
  it('answers unresolved, never external, when the file is missing', () => {
    expect(use('Shared\\Missing\\Thing').resolution).toBe('unresolved');
  });

  it('still calls the whole `vendor/package` name external', () => {
    // Both halves, which is the one compare strong enough to go past a prefix:
    // `GuzzleHttp\Psr7\Request` is `guzzlehttp/psr7`. It keeps 302 of
    // guzzle's and laravel's answers definite and takes back none of phpunit's.
    expect(use('Shared\\Kit\\Thing').resolution).toBe('external');
  });

  it('lets a rule that landed on a real file beat even that', () => {
    expect(use('Shared\\Kit\\Real')).toEqual({
      toPath: 'shared-src/Kit/Real.php',
      resolution: 'first-party'
    });
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

/**
 * THE CLASSMAP SHAPE, WHICH IS A SECOND TREE BECAUSE IT IS A SECOND WORLD.
 *
 * sebastianbergmann/phpunit is named `phpunit/phpunit`, its whole autoload is
 * `classmap: ["src/"]`, and it declares `phpunit/php-code-coverage` and four
 * more packages under the same vendor. So the head `phpunit` was drawn from a
 * real dependency and no autoload RULE covers the repository's own code at
 * all, which is why the prefix fix above cannot reach this case. ./composer.ts
 * drops the halves of a classmap manifest's OWN name from `heads` instead.
 */
describe('a repository that maps its own classes with a classmap', () => {
  let classmapRoot: string;
  const CLASSMAP_FILES = ['composer.json', 'src/Framework/TestCase.php'];

  beforeAll(() => {
    classmapRoot = mkdtempSync(join(tmpdir(), 'gmux-arch-php-classmap-'));
    mkdirSync(join(classmapRoot, 'src', 'Framework'), { recursive: true });
    writeFileSync(
      join(classmapRoot, 'composer.json'),
      JSON.stringify({
        name: 'phpunit/phpunit',
        require: {
          'phpunit/php-code-coverage': '^10',
          'psr/log': '^3.0'
        },
        autoload: { classmap: ['src/'], files: ['src/Functions.php'] }
      })
    );
  });

  afterAll(() => {
    rmSync(classmapRoot, { recursive: true, force: true });
  });

  const classmapUse = (specifier: string): { resolution: string } =>
    resolveImport(
      specifier,
      'tests/Metadata/Test.php',
      'php',
      archResolveContext(readArchManifests(classmapRoot), CLASSMAP_FILES),
      'static'
    );

  it('does not call its own head a dependency of itself', () => {
    // `phpunit` is the vendor half of `phpunit/php-code-coverage` AND the head
    // this repository publishes under. It can no longer tell one world from
    // the other, so it admits nothing.
    expect(classmapUse('PHPUnit\\Framework\\TestCase').resolution).toBe(
      'unresolved'
    );
  });

  it('drops that head and no other', () => {
    expect(classmapUse('Psr\\Log\\LoggerInterface').resolution).toBe('external');
  });
});
