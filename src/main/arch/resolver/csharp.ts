/**
 * The C sharp arm (Phase 184), and it resolves at PROJECT GRAIN, deliberately.
 *
 * WHAT IT CLAIMS, AND WHY THE GRAIN IS NOT FINER. A `using` names a NAMESPACE,
 * never a file. Files in the same namespace see each other with no `using` at
 * all, so file to file edges inside a namespace DO NOT EXIST IN THE SOURCE and
 * this arm never invents one. What it answers is the edge the source does
 * contain: the specifier names a namespace some tracked `.cs` file declares,
 * and the edge lands on the DIRECTORY of the project those files belong to.
 * That is the Swift arm's target grain arrived at from the other direction,
 * and it is the same shape the Go arm has answered since Phase 63.
 *
 * THE MEASUREMENT THAT DECIDED IT, and it is not close. A file's namespace
 * matches the directory it sits in for 58 percent of serilog, 44 percent of
 * Nancy and 0.3 percent of SignalR, being 2 files of 656. A namespace lives
 * inside exactly one `.csproj` for 44 of serilog's 44, 149 of Nancy's 153 and
 * 86 of SignalR's 97. The convention every JVM arm leans on simply does not
 * exist here, and the assembly does.
 *
 * ANY ANSWER OF THIS ARM IS A DIRECTORY, WHICH IS THE PHASE 180 HAZARD, AND IT
 * IS ALREADY FIXED. `buildImportGraph` in ../checkers/imports.ts used to look a
 * `toPath` up in a map keyed only by tracked FILES, so a directory answer
 * vanished from BOTH sides of the ledger and a `must-not` crossed by 33 real
 * Swift imports printed convergent with zero offending. `ownersOfDirectory`
 * there is the fix, and this phase adds a C sharp row to the conformance
 * fixture so a later round cannot undo it for this arm either. NO OTHER PART
 * OF THE CHECKER MOVED IN THIS PHASE.
 *
 * THE RULES, in the order they are asked:
 *  1. THE ENCLOSING NAMESPACES FIRST, INNERMOST OUT, which is what the compiler
 *     does. `using Configuration;` written inside `namespace Nancy` means
 *     `Nancy.Configuration`, and 47 of Nancy's first party answers are found
 *     only this way. The bare name is tried LAST, because that is the global
 *     lookup.
 *  2. A namespace exactly one project declares resolves first party to that
 *     project's directory.
 *  3. A namespace SEVERAL projects declare is `unresolved`, which is the Swift
 *     arm's ambiguity rule. SignalR has 196 such usings across 10 namespaces
 *     and picking one of them would be a real edge to the wrong assembly.
 *  4. A .NET platform head is `external`, checked AFTER the repository's own
 *     projects have had their chance at the name.
 *  4.5 A namespace SOME TRACKED `.cs` FILE DECLARES, even one no project owns,
 *     is `unresolved` rather than `external`. A repository keeps source no
 *     `.csproj` claims in a literal this reader can take, being efcore's
 *     `src/Shared` and Polly's `src/LegacySupport`, and those files really do
 *     declare `System.Text`, `System.Reflection` and
 *     `System.Diagnostics.CodeAnalysis`. 397 real `using` statements over
 *     those two repositories called the repository's own code somebody else's
 *     before this rule, and each was a false green waiting on a must-not. It
 *     names no directory because a file in no project is in no assembly.
 *  5. A declared `<PackageReference>` or `<Reference>` is `external`. THE
 *     COMPARE IS LOWER CASED and that is not a nicety: NuGet ids are case
 *     insensitive while namespaces are Pascal case, so `using Xunit;` against
 *     `<PackageReference Include="xunit" />` fails a byte compare, and that
 *     one shape accounted for 210 of Nancy's and 100 of SignalR's apparent
 *     misses.
 *  6. A namespace no file declares but some file's namespace is UNDER
 *     resolves like rule 2, because a declaration creates its parents
 *     implicitly: `namespace Nancy.Tests.Unit` makes `using Nancy.Tests;`
 *     legal. It is asked LAST, and that order is measured: asked before rule 4
 *     it caught `using System;` on SignalR, where a file declares a namespace
 *     under `System` and the implicit parent spans several projects, and
 *     unresolved rose from 227 to 678 on that repository alone.
 *  7. Everything else is `unresolved`, NEVER `external`.
 *  8. A project whose directory is the REPOSITORY ROOT answers `unresolved`,
 *     whatever rule found it. See `atProjectDirectory` below: the answer would
 *     name the whole tree, an edge to everywhere is not an edge, and before
 *     this was refused it vanished from the checker and printed a false green.
 *
 * THE LIMIT ON ITS FACE, AND IT IS FOUR THINGS. A namespace only an unowned
 * file declares can never be first party, by rule 4.5: the arm knows the name
 * is the repository's and cannot say which assembly holds it, so every promise
 * across it reads unverifiable rather than kept. An edge lands on a project
 * DIRECTORY, so a promise written about one file inside a project cannot be
 * told from a promise about its neighbour. A repository with no `.csproj` at
 * all resolves nothing first party. And a repository whose ONLY `.csproj` sits
 * at its root resolves nothing first party either, by rule 8, which is a real
 * cost on a common single project shape and is the honest answer at this
 * grain: every one of its namespaces lives in the one assembly that holds
 * every file.
 *
 * NOTHING HERE SPAWNS ANYTHING. Set membership against the caller's file list
 * plus what ./csproj.ts read. No specifier reaches an argv.
 */

import { external, firstParty, unresolved, type ArchResolution } from './answers';
import type { ArchResolveContext } from './index';

/** The characters a C sharp namespace may be written with. */
const PLAIN_NAMESPACE = /^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*)*$/;

/**
 * The global namespace qualifier, which is part of the syntax and not part of
 * the name. `using global::FluentValidation.Validators;` names
 * `FluentValidation.Validators` and says only that the lookup skips the
 * enclosing namespaces, which is why the enclosing walk is skipped for it.
 */
const GLOBAL_QUALIFIER = 'global::';

/**
 * Namespace heads the .NET platform owns, which no manifest declares and
 * every project may `using`. The list is checked AFTER the repository's own
 * projects, so a project that really declares `System.Something` wins.
 * `Microsoft` is NOT here, because most of it is NuGet and SignalR's own
 * assemblies live under `Microsoft.AspNet.SignalR`.
 */
const DOTNET_PLATFORM = [
  'System', 'Microsoft.CSharp', 'Microsoft.VisualBasic', 'Microsoft.Win32',
  'Windows', 'Mono', 'Internal'
];

/** Resolve one C sharp using. */
export function resolveCsharp(
  specifier: string,
  fromPath: string,
  ctx: ArchResolveContext
): ArchResolution {
  const trimmed = specifier.trim();
  const qualified = trimmed.startsWith(GLOBAL_QUALIFIER);
  const spec = qualified ? trimmed.slice(GLOBAL_QUALIFIER.length) : trimmed;
  if (spec.length === 0 || !PLAIN_NAMESPACE.test(spec)) return unresolved();
  const csharp = ctx.manifests.csharp;
  const asked = candidates(spec, qualified ? undefined : csharp.namespaceOf.get(fromPath));
  const found = (map: Map<string, string[]>): ArchResolution | null => {
    for (const candidate of asked) {
      const dirs = map.get(candidate);
      if (dirs === undefined || dirs.length === 0) continue;
      // Rule 3: several assemblies declare it, so no one directory is the
      // answer and a coin flip would be a real edge to the wrong one.
      if (dirs.length > 1) return unresolved();
      return atProjectDirectory(dirs[0]);
    }
    return null;
  };
  // A namespace some file really declares beats everything.
  const declared = found(csharp.namespaceDirs);
  if (declared !== null) return declared;
  // RULE 4.5, AND IT IS THE SECOND FIX ROUND. A name some tracked `.cs` file
  // declares is never somebody else's, even when no project claims that file.
  // efcore's `src/Shared` and Polly's `src/LegacySupport` hold real source
  // pulled into their assemblies by an MSBuild glob ./csproj.ts takes no
  // literal from, so `System.Text`, `System.Reflection` and
  // `System.Diagnostics.CodeAnalysis` were declared by the repository and
  // claimed by the platform at the same time, and 397 real `using` statements
  // over those two repositories answered `external` about the repository's own
  // code. An `external` is dropped from both sides of the checker's ledger, so
  // each one of them was a false green waiting on a must-not. There is no
  // directory to name, because a file no project owns is in no assembly, so
  // the answer is grey.
  for (const candidate of asked) {
    if (csharp.declaredNames.has(candidate)) return unresolved();
  }
  if (claimedExternally(spec, ctx)) return external();
  // THE IMPLICIT PARENT IS ASKED LAST, AND THE ORDER IS MEASURED. Asking it
  // before the platform put `using System;` on the prefix map, because a
  // SignalR file declares a namespace under `System`, and the prefix spans
  // several projects so every one of them went grey: unresolved rose from 227
  // to 678 on that repository alone. An implicit parent is a weaker claim than
  // a name the platform owns, and it is asked in that order.
  const implicit = found(csharp.namespacePrefixDirs);
  if (implicit !== null) return implicit;
  return unresolved();
}

/**
 * One project directory as an answer, and the repository ROOT is not one.
 *
 * THE PHASE 184 FIX ROUND, AND IT IS THE PHASE 180 HAZARD AT ITS BOUNDARY. A
 * `.csproj` AT THE REPOSITORY ROOT, which is what a one project repository
 * looks like, has the empty string for its directory. `firstParty('')` then
 * named the whole tree: `owners.get('')` in ../checkers/imports.ts misses
 * because no tracked path is the empty string, and `ownersOfDirectory('')`
 * searched for paths beginning with `/`, of which a repository has none. So
 * the answer was neither a crossing nor a miss and simply vanished, and a
 * must-not a real `using` crosses printed convergent, checked, zero offending.
 * An edge to EVERYWHERE is not an edge and it is not a definite answer either,
 * so it is grey. The checker refuses the empty path a second time, because a
 * fix in one arm is a fix one arm has. See rule 8 on this face.
 */
function atProjectDirectory(dir: string | undefined): ArchResolution {
  return dir === undefined || dir === '' ? unresolved() : firstParty(dir);
}

/**
 * The names one `using` could mean, innermost enclosing namespace first and
 * the bare name last, which is the order the compiler looks in.
 */
function candidates(spec: string, own: string | undefined): string[] {
  const out: string[] = [];
  if (own !== undefined) {
    const parts = own.split('.');
    for (let take = parts.length; take > 0; take -= 1) {
      out.push(`${parts.slice(0, take).join('.')}.${spec}`);
    }
  }
  out.push(spec);
  return out;
}

/** Did the platform, or a declared reference, claim this namespace? */
function claimedExternally(spec: string, ctx: ArchResolveContext): boolean {
  for (const platform of DOTNET_PLATFORM) {
    if (spec === platform || spec.startsWith(`${platform}.`)) return true;
  }
  // NuGet ids are case insensitive and namespaces are Pascal case. See rule 5.
  const lower = spec.toLowerCase();
  for (const name of ctx.manifests.csharp.packages) {
    if (lower === name) return true;
    if (lower.startsWith(`${name}.`)) return true;
    // A package whose id is longer than the namespace it publishes:
    // `Microsoft.AspNet.SignalR.Core` publishes `Microsoft.AspNet.SignalR`.
    if (name.startsWith(`${lower}.`)) return true;
  }
  return false;
}
