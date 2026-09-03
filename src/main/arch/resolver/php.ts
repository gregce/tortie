/**
 * The PHP arm (Phase 184), and it resolves at FILE grain.
 *
 * WHAT IT CLAIMS, AND IT IS THE ONLY ARM IN THIS RESOLVER THAT LEANS ON NO
 * CONVENTION AT ALL. Composer's `autoload.psr-4` map names the namespace
 * prefix to directory mapping OUTRIGHT, so `use GuzzleHttp\Psr7\Request`
 * resolves because a person wrote `"GuzzleHttp\\": "src/"` in
 * `composer.json`, not because a directory happened to be spelled a certain
 * way. Longest prefix first, each listed directory in order, and the rest of
 * the name as a path with `.php` on the end. That is the same shape
 * `resolveAlias` in ./index.ts has used for tsconfig `paths` since Phase 63,
 * including the honest unresolved when a rule MATCHED and no file exists.
 *
 * PSR-0 IS READ TOO AND IT IS NOT THE SAME RULE, IN TWO WAYS. Under PSR-0 the
 * prefix is NOT stripped: the whole class name goes under the directory, so
 * `Zend_Db_Adapter` with `"Zend_": "legacy/"` is `legacy/Zend/Db/Adapter.php`
 * where PSR-4 would have said `legacy/Db/Adapter.php`. And an underscore in
 * the CLASS NAME is also a directory separator, which is the legacy shape Zend
 * and PEAR era code is written in. Reading PSR-4's rule over a PSR-0 map misses
 * those files and reading PSR-0's over a PSR-4 map invents directories that do
 * not exist, so the standard travels with the rule.
 *
 * THE THREE LIMITS, EACH MEASURED, EACH ON THIS FACE.
 *
 *  1. **A repository with no `composer.json` resolves nothing first party.**
 *     WordPress is the case: 1,900 `.php` files, no Composer manifest
 *     anywhere, and 730 of its 790 `use` statements answer `unresolved`.
 *     A "namespace path as a unique path tail" fallback was measured against
 *     that and REFUSED: it rescues 84 of the 730, being 10.6 percent, because
 *     WordPress's bundled namespaces need a prefix strip a tail match cannot
 *     do, and where a PSR-4 map does exist it is redundant and brings 141 new
 *     ambiguities with it on laravel alone. Grey is the right answer here.
 *  2. **A `require` whose path is not wholly literal answers unresolved, and
 *     `ABSPATH . '...'` is the case that makes it tempting.** Treating
 *     `ABSPATH` as the repository root resolves 495 of WordPress's 658
 *     constant prefixed sites. It is defined at run time in `wp-load.php`
 *     from `dirname(__FILE__)` and NOTHING declares it as a root, so
 *     resolving through it is inventing an edge. `__DIR__` and
 *     `dirname(__FILE__)` are read, because they name the including file's own
 *     directory and this arm already knows it: 163 of WordPress's 166 such
 *     sites and 12 of laravel's 16 land on a tracked file.
 *  3. **A group `use A\B\{C, D}` resolves nothing.** The grammar hands the
 *     head over without its clauses, so the specifier names a NAMESPACE, which
 *     is a directory, and this arm answers with files. It appears 0 times in
 *     the 15,793 `use` statements across guzzle, laravel and WordPress.
 *  4. **A name under one of the repository's OWN autoload prefixes is grey
 *     when no file was found, and it is never `external`.** This is the Phase
 *     184 fix round and it is the most important line in this file. A PHP
 *     library's own namespace head is almost always ALSO the vendor half of a
 *     package it declares, so falling through to the head compare below called
 *     the repository's own classes somebody else's dependency: measured over
 *     sebastianbergmann/phpunit, 7,418 of its 11,638 `use` statements, being
 *     63.7 percent, named a class a tracked file in that same repository
 *     declares and answered `external`, and a `must-not` from
 *     `tests/_files/Metadata` to `src` that 132 of them cross printed
 *     convergent, checked, zero offending through the real checker. So a
 *     declared prefix that MATCHED and found no file answers `unresolved`,
 *     which is grey and true, and the head compare is asked only about names
 *     no prefix of this repository claims. ONE COMPARE IS STRONG ENOUGH TO GO
 *     PAST THE PREFIX, being the name's first two segments spelling a declared
 *     package IN FULL, both halves: `GuzzleHttp\Psr7\Request` is
 *     `guzzlehttp/psr7`, which guzzle declares and does not hold. That rule
 *     keeps 122 of guzzle's and 180 of laravel's answers definite, and none of
 *     the 302 is a class either repository declares in a tracked file of its
 *     own. The cost of limit 4 after it is 57 of guzzle's and 115 of laravel's
 *     answers turning grey, which is the price of the 7,414 phpunit ones that
 *     were false.
 *
 * WHAT ADMITS `external`, and there are two, both asked only after limit 4 has
 * let the name past. A name whose first segment, lower cased, is EITHER HALF of
 * a declared `require` or `require-dev` package:
 * `use Psr\Http\Message\RequestInterface` against `"psr/http-message"` takes
 * the vendor half, and `use Carbon\CarbonInterval` against `"nesbot/carbon"`
 * takes the package half. Composer names are lower case with a slash and
 * namespaces are Pascal case with a backslash, so the compare is lower cased,
 * which is the same shape the C sharp arm needs for NuGet. And a name with NO backslash at all
 * that ./php-runtime.ts lists, because PHP has no namespaced standard library
 * and puts `Closure`, `RuntimeException` and `ReflectionClass` in the global
 * namespace instead. Without that second list laravel showed 1,877 imports as
 * misses whose top five were `Closure`, `InvalidArgumentException`,
 * `RuntimeException`, `Exception` and `Throwable`, which is a resolver with
 * nothing to compare against rather than a resolver finding nothing. A name
 * neither list claims is `unresolved`, never `external`.
 *
 * THE TWO WORLDS RULE IS ASKED IN A DIFFERENT ORDER HERE, AND THE NUMBER
 * BEHIND THAT IS WHY. Kotlin and Swift go grey when the repository and the outside
 * world both claim a name, because in those arms the FIRST PARTY claim is
 * itself a guess: a suffix match, or a target name. Here it is the opposite.
 * The autoload map is an explicit declaration naming a directory, and the
 * external side is a textual vendor head compare. So an autoload rule that
 * lands on a TRACKED FILE wins outright, and the vendor compare is asked only
 * when no rule named a file. Run the other way round on guzzle, whose own
 * `GuzzleHttp\` prefix is also the vendor of the declared `guzzlehttp/psr7`
 * and `guzzlehttp/promises`, the grey rule threw away every one of its 369
 * first party answers and left the repository reading as though it contained
 * no code of its own. Limit 4 above is the OTHER half of the same thought: a
 * rule that landed on a file still wins outright, and a rule that matched and
 * landed on nothing goes grey rather than handing the name to the vendor
 * compare, which would have called it external.
 *
 * NOTHING HERE SPAWNS ANYTHING. Set membership against the caller's file list
 * plus the map ./composer.ts read. No specifier reaches an argv.
 */

import { external, firstParty, unresolved, type ArchResolution } from './answers';
import type { ArchResolveContext } from './index';
import { joinWithin, parentOf } from './paths';
import { PHP_RUNTIME_CLASSES } from './php-runtime';

/** The characters a PHP qualified name may be written with. */
const PLAIN_NAME = /^[A-Za-z_\x80-\uffff][A-Za-z0-9_\x80-\uffff]*(\\[A-Za-z_\x80-\uffff][A-Za-z0-9_\x80-\uffff]*)*$/;

/** A quoted literal, either quote style, with nothing else in it. */
const LITERAL = /^\s*(['"])([^'"]*)\1\s*$/;

/** `__DIR__` or `dirname(__FILE__)`, the two shapes that name the file's own directory. */
const OWN_DIR = /^\s*(?:__DIR__|dirname\s*\(\s*__FILE__\s*\))\s*\.\s*/;

/** Resolve one PHP import. */
export function resolvePhp(
  specifier: string,
  fromPath: string,
  ctx: ArchResolveContext,
  form: 'use' | 'require'
): ArchResolution {
  const spec = specifier.trim();
  if (spec.length === 0) return unresolved();
  if (form === 'require') return requirePath(spec, fromPath, ctx);
  // A leading backslash makes a name fully qualified and is not part of it.
  const name = spec.startsWith('\\') ? spec.slice(1) : spec;
  if (!PLAIN_NAME.test(name)) return unresolved();
  // A rule a person wrote, landing on a file that is really there, beats a
  // vendor name that merely shares its first segment. See the header.
  const hit = byAutoload(name, ctx);
  if (hit !== null) return firstParty(hit);
  // A WHOLE `vendor/package` NAME, BOTH HALVES, BEATS THE PREFIX. See limit 4.
  if (claimedByWholePackage(name, ctx)) return external();
  // THE PREFIX MATCHED AND NO FILE WAS FOUND, WHICH IS THE REPOSITORY'S OWN
  // NAMESPACE WITH A GAP IN IT. See the fourth limit on this face.
  if (claimedByAutoload(name, ctx)) return unresolved();
  if (claimedExternally(name, ctx)) return external();
  return unresolved();
}

/**
 * The autoload map, longest prefix first, each listed directory in order.
 *
 * A rule that MATCHED and named no tracked file returns null rather than
 * stopping the walk, because Composer itself keeps looking: `Illuminate\` and
 * `Illuminate\Support\` both cover `Illuminate\Support\Str`, and only one of
 * them holds the file.
 */
function byAutoload(name: string, ctx: ArchResolveContext): string | null {
  for (const rule of ctx.manifests.php.rules) {
    if (rule.prefix.length > 0 && !name.startsWith(rule.prefix)) continue;
    const rest = name.slice(rule.prefix.length);
    if (rest.length === 0) continue;
    // PSR-0 keeps the prefix and PSR-4 strips it. See the header.
    const relative =
      rule.standard === 'psr-0'
        ? psrZeroPath(name)
        : rest.split('\\').join('/');
    for (const dir of rule.dirs) {
      const candidate = joinWithin(dir, `${relative}.php`);
      if (candidate !== null && ctx.files.has(candidate)) return candidate;
    }
  }
  return null;
}

/**
 * PSR-0's path rule: namespace separators become directory separators, and so
 * do the underscores in the last segment, which is the whole difference from
 * PSR-4.
 */
function psrZeroPath(rest: string): string {
  const parts = rest.split('\\');
  const last = parts.pop() ?? '';
  parts.push(last.split('_').join('/'));
  return parts.join('/');
}

/**
 * A `require`, `require_once`, `include` or `include_once` argument.
 *
 * The specifier arrives as the ARGUMENT NODE'S OWN TEXT, the way an
 * Objective-C system include arrives with its angle brackets on, because the
 * shape of the expression is the fact this arm has to read. A bare literal has
 * already had its quotes stripped by the extractor, and anything else has not.
 */
function requirePath(
  spec: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  const dir = parentOf(fromPath);
  const own = OWN_DIR.exec(spec);
  const rest = own === null ? spec : spec.slice(own[0].length);
  const literal = LITERAL.exec(rest);
  // A bare literal reaches this arm with its quotes already off, so the whole
  // specifier IS the path. Anything else has to be a quoted literal here, and
  // a constant, a variable or an expression that continues past the first
  // literal is refused rather than guessed at. See limit 2 on this face.
  const path =
    own === null && literal === null
      ? spec.includes("'") || spec.includes('"') || spec.includes('$')
        ? null
        : spec
      : (literal?.[2] ?? null);
  if (path === null || path.length === 0) return unresolved();
  const joined = joinWithin(dir, path);
  if (joined !== null && ctx.files.has(joined)) return firstParty(joined);
  // Composer's own entry point, which a repository does not track.
  return unresolved();
}

/**
 * Did the name's first TWO segments spell a declared package name in full?
 *
 * This is the one compare strong enough to answer `external` about a name the
 * repository's own prefix also covers, and it is measured. `GuzzleHttp\Psr7\
 * Request` is `guzzlehttp/psr7`, which guzzle declares, and no file named
 * `src/Psr7/Request.php` exists in that repository. Over guzzle and
 * laravel/framework it takes 302 names back from grey and NOT ONE of them is a
 * class either repository declares in a tracked file of its own; over
 * sebastianbergmann/phpunit, whose own classes limit 4 exists for, it takes
 * back zero. A head alone can never do this: `phpunit` is the vendor of five
 * declared packages and also the head of the repository itself.
 */
function claimedByWholePackage(name: string, ctx: ArchResolveContext): boolean {
  const parts = name.split('\\');
  if (parts.length < 2) return false;
  const whole = `${(parts[0] ?? '').toLowerCase()}/${(parts[1] ?? '').toLowerCase()}`;
  return ctx.manifests.php.packages.has(whole);
}

/**
 * Did one of THIS repository's own autoload prefixes claim this name, whether
 * or not a file was found under it?
 *
 * A prefix is a person writing down that the repository owns a namespace, and
 * it stays true when `byAutoload` above lands on nothing: the class may live in
 * a file of another name, or under a `classmap` this reader does not follow.
 * The empty prefix is Composer's fallback rule and matches every name, so it
 * claims nothing here; treating it as a claim would silence `external` for the
 * whole repository.
 */
function claimedByAutoload(name: string, ctx: ArchResolveContext): boolean {
  for (const rule of ctx.manifests.php.rules) {
    if (rule.prefix.length === 0) continue;
    if (name.startsWith(rule.prefix)) return true;
  }
  return false;
}

/** Did a declared Composer package, or PHP's own runtime, claim this name? */
function claimedExternally(name: string, ctx: ArchResolveContext): boolean {
  // No backslash means the GLOBAL namespace, which is where PHP's own classes
  // live, and it is ALSO where a one word package publishes: `use Mockery;`
  // against `"mockery/mockery"`. Both lists are asked. `App\Exception` has a
  // backslash and is never matched against the runtime list.
  if (!name.includes('\\') && PHP_RUNTIME_CLASSES.has(name)) return true;
  const head = (name.split('\\')[0] ?? '').toLowerCase();
  if (head.length === 0) return false;
  return ctx.manifests.php.heads.has(head);
}
