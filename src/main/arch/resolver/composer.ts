/**
 * What the repository's Composer manifests literally declare, for the PHP arm
 * (Phase 184).
 *
 * COMPOSER IS THE MOST EXPLICIT DECLARATION ANY LANGUAGE IN THIS PHASE MAKES.
 * `autoload.psr-4` names the namespace prefix to directory mapping outright,
 * so nothing here is a convention and nothing here is a guess: a PHP first
 * party answer exists exactly where a person wrote one of these rules down.
 *
 * WHAT IT READS. Every `composer.json` the bounded walk finds, and inside each
 * one `autoload` and `autoload-dev`, their `psr-4` and `psr-0` blocks, and the
 * `require` and `require-dev` names. Every directory is joined onto the
 * manifest's OWN directory, which is what makes a nested package's rules point
 * at that package rather than at the root.
 *
 * WHAT IT DELIBERATELY DOES NOT READ, WITH THE REASON. `autoload.classmap`
 * names directories to be SCANNED for classes, so mapping a class name to a
 * file through one means reading every file underneath it and parsing each for
 * the class it declares. Guessing instead, by taking the name's last segment as
 * a basename under the classmap root, would invent edges wherever two
 * directories hold a file of the same name, which is the wrong-edge hazard
 * every arm in this resolver refuses. So a class only a classmap could explain
 * answers `unresolved`, and the limit is on the PHP arm's own face. `files` is
 * left alone for the same reason: it names files to be INCLUDED, not a name to
 * find them by.
 *
 * AND THAT PROMISE COST ONE MORE LINE THAN THE FIRST BUILD OF THIS READER
 * WROTE, WHICH IS THE PHASE 184 FIX ROUND. A manifest whose own code is
 * declared through `classmap` or `files` has first party classes NO RULE HERE
 * CAN MAP, so nothing downstream can tell them from a dependency's, and the
 * vendor head compare then answers `external` about the repository itself.
 * sebastianbergmann/phpunit is the whole case: it is named `phpunit/phpunit`,
 * its autoload is `classmap: ["src/"]`, and it declares
 * `phpunit/php-code-coverage` and friends, so the head `phpunit` was drawn
 * from a real dependency and claimed 7,414 of the repository's own `use`
 * statements. So when a manifest declares a `classmap` or a `files` list, the
 * halves of ITS OWN `name` are removed from `heads` after every manifest has
 * been read. A repository is never its own dependency, and a head it publishes
 * under can no longer tell one world from the other.
 *
 * NOTHING HERE SPAWNS ANYTHING. No composer, no php. Values read here are
 * compared against import specifiers and reach no argv.
 */

import { readJsonFile } from './jsonc';
import { normalizeRel } from './paths';
import { walkForFiles } from './tree-walk';

/** One autoload rule, already joined onto the manifest's own directory. */
export interface PhpAutoloadRule {
  /**
   * The namespace prefix as written, backslashes and all, e.g. `GuzzleHttp\`.
   * An empty prefix is Composer's fallback rule and matches everything.
   */
  prefix: string;
  /** Repository relative directories, in the order the manifest listed them. */
  dirs: string[];
  /** Which standard's path rule applies. They differ over the underscore. */
  standard: 'psr-4' | 'psr-0';
}

/** What the Composer files said, reduced to what the arm compares. */
export interface PhpManifest {
  /** Every autoload rule found, LONGEST PREFIX FIRST, which is PSR-4's own order. */
  rules: PhpAutoloadRule[];
  /**
   * The vendor half AND the package half of every declared package name, lower
   * cased, each admitting a namespace head that equals it.
   *
   * BOTH HALVES ARE NEEDED AND THE SECOND ONE IS MEASURED. A Composer name is
   * `vendor/package` and a namespace is Pascal case, and which half the
   * namespace takes after is the package author's choice: `psr/http-message`
   * publishes `Psr\Http\Message` and `nesbot/carbon` publishes `Carbon`. The
   * vendor half alone left 96 of laravel's imports of Carbon reading as misses.
   * A half shorter than three characters is dropped, because a two letter word
   * admits far too much.
   */
  heads: Set<string>;
  /** Every declared package name in full, lower cased. */
  packages: Set<string>;
  /** True when a composer.json was found at all. The arm says so on its face. */
  present: boolean;
}

export function emptyPhpManifest(): PhpManifest {
  return { rules: [], heads: new Set(), packages: new Set(), present: false };
}

/** How many composer.json files the walk will read. */
const MAX_COMPOSER_FILES = 256;

/** Read the Composer declarations out of one repository. */
export function readPhpManifest(repoPath: string): PhpManifest {
  const out = emptyPhpManifest();
  // The halves of the name of every manifest whose own classes no rule here can
  // map. They are removed from `heads` at the end, after every manifest has had
  // its chance to add one. See the classmap paragraph on this face.
  const publishedByThisRepository = new Set<string>();
  const files = walkForFiles(
    repoPath,
    (name) => name === 'composer.json',
    MAX_COMPOSER_FILES
  );
  for (const relPath of files) {
    const json = readJsonFile(`${repoPath}/${relPath}`);
    if (json === null) continue;
    out.present = true;
    const dir = relPath.slice(0, Math.max(0, relPath.lastIndexOf('/')));
    let unmappable = false;
    for (const block of ['autoload', 'autoload-dev']) {
      const autoload = json[block];
      if (autoload === null || typeof autoload !== 'object') continue;
      const record = autoload as Record<string, unknown>;
      readRules(record['psr-4'], 'psr-4', dir, out.rules);
      readRules(record['psr-0'], 'psr-0', dir, out.rules);
      if (record['classmap'] !== undefined || record['files'] !== undefined) {
        unmappable = true;
      }
    }
    if (unmappable) {
      for (const half of nameHalves(json['name'])) {
        publishedByThisRepository.add(half);
      }
    }
    for (const block of ['require', 'require-dev']) {
      const required = json[block];
      if (required === null || typeof required !== 'object') continue;
      for (const name of Object.keys(required as Record<string, unknown>)) {
        const lower = name.toLowerCase();
        if (!lower.includes('/')) continue;
        out.packages.add(lower);
        const cut = lower.indexOf('/');
        for (const half of [lower.slice(0, cut), lower.slice(cut + 1)]) {
          if (half.length >= 3) out.heads.add(half);
        }
      }
    }
  }
  // A name this repository PUBLISHES under can never be the reason to call one
  // of its own classes a dependency, however many declared packages also carry
  // that head. See the classmap paragraph on this face.
  for (const half of publishedByThisRepository) out.heads.delete(half);
  // Longest prefix first, which is the order PSR-4 itself resolves in: a rule
  // for `Illuminate\Support\` has to beat the `Illuminate\` that overlaps it.
  out.rules.sort((a, b) => b.prefix.length - a.prefix.length);
  return out;
}

/**
 * The two halves of a `vendor/package` name, lower cased, on the same terms
 * `heads` admits one: a half shorter than three characters admits far too much
 * and was never added, so it is never removed either.
 */
function nameHalves(raw: unknown): string[] {
  if (typeof raw !== 'string') return [];
  const lower = raw.toLowerCase();
  const cut = lower.indexOf('/');
  if (cut === -1) return [];
  const halves = [lower.slice(0, cut), lower.slice(cut + 1)];
  return halves.filter((half) => half.length >= 3);
}

/** One `psr-4` or `psr-0` block, whose values are a string or a list of them. */
function readRules(
  block: unknown,
  standard: 'psr-4' | 'psr-0',
  manifestDir: string,
  into: PhpAutoloadRule[]
): void {
  if (block === null || typeof block !== 'object' || Array.isArray(block)) return;
  for (const [prefix, raw] of Object.entries(block as Record<string, unknown>)) {
    const targets = Array.isArray(raw) ? raw : [raw];
    const dirs: string[] = [];
    for (const target of targets) {
      if (typeof target !== 'string') continue;
      // An empty target is the manifest's own directory, which is legal and
      // which `normalizeRel` would otherwise turn into the repository root.
      const joined = target === '' ? manifestDir : `${manifestDir}/${target}`;
      dirs.push(normalizeRel(joined));
    }
    if (dirs.length === 0) continue;
    into.push({ prefix, dirs, standard });
  }
}
