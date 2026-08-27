/**
 * The four answers a resolver arm may give, and the only way to build one
 * (Phase 157).
 *
 * WHY THIS IS ITS OWN MODULE. Phase 157 added three arms in parallel and each
 * one wrote `external()` and `unresolved()` out again, joining the copy that
 * was already in `./index.ts`. That is four copies of the two constructors that
 * decide the single most consequential thing this feature says. Putting them
 * here is not tidiness: it means the rule below is written down once, beside
 * the code, where an arm's author reads it rather than reading a paraphrase.
 *
 * THE RULE, AND IT BINDS EVERY ARM. An arm that cannot answer returns
 * `unresolved`, NEVER `external`. Phase 63's verifier caught the resolver
 * answering `external` when it had run out of ideas. The cost is not a wrong
 * count. `src/main/arch/checkers/imports.ts` drops an `external` from BOTH
 * sides of the ledger, so it is neither a crossing nor an unresolved one, and a
 * first party import wearing that answer leaves a `must-not` promise across it
 * GREEN. A false green on a `must-not` is the most damaging thing this feature
 * can print. Being grey about a package nobody declared is the safe half of the
 * trade, every time.
 *
 * So `external()` is reached only where the repository ITSELF said the name is
 * a dependency, or where the name belongs to a platform standard library that
 * no manifest can declare and no repository can vendor, and the standard
 * library is checked AFTER the repository's own files have had their chance at
 * the name.
 *
 * THIS MODULE IS A LEAF. Its only import is a type.
 */

import type { ArchImportResolution } from '../db';

/** What one specifier resolved to. */
export interface ArchResolution {
  /** Repository relative path, or the package directory for Go. Null unless first party. */
  toPath: string | null;
  resolution: ArchImportResolution;
}

/** A file in this repository, named. The only answer that produces a judgeable edge. */
export function firstParty(toPath: string): ArchResolution {
  return { toPath, resolution: 'first-party' };
}

/**
 * A dependency or a platform builtin. A DEFINITE answer, and read the rule in
 * this module's header before adding a call site.
 */
export function external(): ArchResolution {
  return { toPath: null, resolution: 'external' };
}

/**
 * Understood, and no file found for it. Counted and shown on the component's
 * own face, so a resolver miss can never masquerade as a verified absence.
 */
export function unresolved(): ArchResolution {
  return { toPath: null, resolution: 'unresolved' };
}

/**
 * A language whose resolution this build does not ship.
 *
 * NOTHING RETURNS THIS ANY MORE. Phase 63 marked Rust and Python here and
 * Phase 157 gave both of them arms, along with Ruby. The answer is kept because
 * the fact base still holds rows written by an older build, because `db.ts`
 * still declares it, and because the next language added is `unverifiable`
 * between the day its query lands and the day its arm does. It is deliberately
 * NOT the same answer as `unresolved`: this one says nobody looked, and that
 * one says somebody looked and did not find it.
 */
export function unverifiable(): ArchResolution {
  return { toPath: null, resolution: 'unverifiable' };
}
