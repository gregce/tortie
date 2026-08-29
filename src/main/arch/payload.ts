/**
 * The payload composer (Phase 64, research 49 section 4.9).
 *
 * A person picks parts, gaps and failing promises in the Architecture view, or
 * from one chord inside a session, and this function turns that selection into
 * ONE block of plain text that goes into a running agent's prompt. It is the
 * aiming verb. The whole point of it is that pointing beats typing, and it only
 * beats typing if the block says things a person could not have typed, being
 * the paths the anchors actually resolve to at HEAD, which promises cross the
 * line they drew, and what Tortie's own checks concluded about each one this
 * minute.
 *
 * ## It is PURE, and that is the Tier 3 evidence
 *
 * It reads no clock, no random number, no environment and no file. Everything
 * it needs arrives in {@link ArchPayloadInput}. So the same input composes the
 * same bytes on this machine and on any other, and `npm run conformance:arch`
 * proves it by composing twice and comparing, over a fact base that is data in
 * the repository rather than a live tree.
 *
 * Every list it walks is sorted before it is written, so the block does not
 * depend on the order a person happened to click in, on a map's iteration
 * order, or on the order rows came back from SQLite.
 *
 * ## The two grades, which is the honesty rule
 *
 * Deterministic content composed at HEAD ALWAYS ships. The names, the resolved
 * paths, the interior promises, the crossing promises marked as crossing, the
 * verdicts and the freshness sentence are facts Tortie computed itself, and
 * they go in whatever their age.
 *
 * Authored prose is the other grade. A description, a note, a label and a gap
 * are words a person or that person's own agent wrote into `docs/arch/`, and
 * Tortie never checks a word of them. They ship only while their part's count
 * of commits behind is under {@link ARCH_PROSE_MAX_COMMITS_BEHIND}, and above
 * it the block carries ONE line per part saying the prose predates N commits.
 * Every line that is quoted carries {@link ARCH_UNVERIFIED_MARK} in the same
 * line, always, so nothing in this block can be read as something Tortie
 * verified. That is the refusal this phase must not lose.
 *
 * Two prose exceptions, both deliberate.
 *
 * A GAP THE PERSON SELECTED always ships, because selecting it is the person
 * saying they want that paragraph. It carries the mark, and when its part is
 * over the threshold it carries the age in the same line rather than being
 * dropped. A gap the person did NOT select, on a part they did select, follows
 * the ordinary grade.
 *
 * A BASELINE REASON always ships. `because` explains a divergence that this
 * same run re-verified against the current bytes, so its subject is current
 * however old the sentence is, and dropping it would leave a person reading
 * "this broke" with the answer to "we know, here is why" withheld. It carries
 * the mark like every other quoted line.
 *
 * ## What it never carries
 *
 * NEVER AN IMAGE. There is no path here that can produce one.
 *
 * NEVER FILE CONTENTS. This module opens no file and reproduces no file's
 * bytes. An evidence record in `docs/arch/` holds a quoted span of somebody's
 * source; the block names its path and its line range and never reprints the
 * span. The one thing it does carry out of source text is the import specifier
 * on an offending line, which the checker already recorded in its verdict and
 * without which "this import crosses the line" names no import at all.
 *
 * NEVER AN ABSOLUTE PATH. Every path is repository relative. The block is read
 * by an agent whose working directory is already the repository, and on a
 * session running on another machine a local absolute path names nothing, so
 * there is no absolute path for it to be wrong about.
 *
 * NEVER A SESSION. This module cannot see one. `build/assert-import-boundaries.mjs`
 * keeps `main/arch/` from naming `main/manifest/`, `main/restore/` or
 * `main/context/`, so the composer takes no session id and could not use one.
 * Deciding which session may be handed a block is the renderer's guard, and it
 * is one exported function so the negative control has one thing to remove.
 *
 * NEVER A SIXTH GIT CALL. It composes no argv at all. The tracked file list it
 * matches anchors against arrives in the input, from the one fixed
 * `git ls-files -z` in `./argv-guard.ts`.
 *
 * NEVER A CONTROL CHARACTER. Every value the block interpolates goes through
 * {@link oneLine} first, and this is a defense rather than tidiness. The block
 * is delivered as ONE bracketed paste, and a bracketed paste ends at the
 * terminator the terminal is watching for. An ESC in the middle of it can close
 * the paste early and hand the rest of the block to the agent's line editor as
 * keystrokes, and a bare carriage return submits the prompt on six of the ten
 * agents `src/shared/agent-defaults.ts` measured. The contract's own fields
 * cannot carry one, because `src/main/arch/schema.ts` refuses
 * `[\u0000-\u001f\u007f]` in every string field. But three of the values here
 * never went through that validator, being a tracked path from
 * `git ls-files -z`, and the offending path and import specifier a verdict
 * carries, which came out of somebody's source file. So the strip is applied to
 * everything, uniformly, rather than to the three that need it today.
 *
 * UNIFORMLY MEANS THE SUMMARY FIELDS TOO. `deadAnchors` and `unknownIds` leave
 * this module beside the text and cross the same process boundary, and
 * `unknownIds` echoes ids the CALLER composed. Nothing renders either of them
 * today, so nothing was wrong today, and the fix round strips them anyway
 * rather than leave a value that arrives at the renderer under a header
 * promising it had been stripped.
 *
 * ## The limit this cannot remove, said plainly rather than hidden
 *
 * `docs/arch/` arrives with a `git pull`, written by whoever last pushed, and
 * this block puts its prose in front of an agent that will act on it. Nothing
 * here can stop that, and nothing should pretend to. What it does instead is
 * mark every quoted line, refuse to quote prose that predates the code by more
 * than {@link ARCH_PROSE_MAX_COMMITS_BEHIND} commits, and compose only what a
 * person selected. The same exposure is true of the repository's own README,
 * and the honest answer is the mark rather than a filter that would have to
 * understand English.
 */

import type {
  ArchComponent,
  ArchDocument,
  ArchEdge,
  ArchFreshness,
  ArchOffending,
  ArchVerdict
} from '@shared/arch';
import {
  ARCH_PROSE_MAX_COMMITS_BEHIND,
  ARCH_UNVERIFIED_MARK,
  archCoverageWord,
  archFreshnessRibbon,
  archUnresolvedSentence,
  archVerdictWord
} from '@shared/arch-copy';
import type { ArchCoverageCounts } from '@shared/arch';
import { archGapId, parseArchGapId } from '@shared/arch-ids';
import type { ArchComposePayloadResult } from '@shared/ipc';
import { componentFiles, matchAnchor } from './checkers/glob';

// ---------------------------------------------------------------------------
// The bounds
// ---------------------------------------------------------------------------

/**
 * How many resolved paths one part contributes before the block says how many
 * more there are.
 *
 * A block is pasted into a prompt, so it competes for the same context window
 * the agent needs for the work. Forty paths is more than enough to recognise a
 * part and far short of a listing that pushes the question out of the window.
 * A part with more says so in one line, and the count is exact.
 */
export const ARCH_PAYLOAD_MAX_FILES_PER_PART = 40;

/** How many offending places one broken promise contributes, for the same reason. */
export const ARCH_PAYLOAD_MAX_OFFENDING = 20;

// ---------------------------------------------------------------------------
// What goes in
// ---------------------------------------------------------------------------

/** What a person picked. Ids only, and every list is sorted before it is used. */
export interface ArchPayloadSelection {
  /** Component ids. */
  componentIds: readonly string[];
  /** Gap ids in the form `component:<id>#gap:<index>`. */
  gapIds: readonly string[];
  /** Verdict subject ids, exactly as the checkers stamped them. */
  verdictIds: readonly string[];
}

/** Everything the composer sees. It reads nothing else, ever. */
export interface ArchPayloadInput {
  /** The repository's own folder name. Never a path, and never absolute. */
  repoName: string;
  /** The contract, its parts and its promises, already validated. */
  document: ArchDocument;
  /** Every tracked path at HEAD, from the one fixed `git ls-files -z`. */
  trackedFiles: readonly string[];
  /** Whatever the last completed check concluded. */
  verdicts: readonly ArchVerdict[];
  /** The two freshness numbers per part. */
  freshness: readonly ArchFreshness[];
  /** The verdict strip's own counts, for the unresolved sentence. */
  counts: ArchCoverageCounts;
  /** The commit the stored verdicts were computed at, or null before any check. */
  checkedAtCommit: string | null;
  selection: ArchPayloadSelection;
}

/**
 * What the composer produced.
 *
 * The fields are declared once, in `src/shared/ipc/arch.ts`, because they are
 * the wire shape of `arch:composePayload` and a second copy of them here is a
 * second thing to keep in step. The registrar adds `cwd` and hands the rest
 * back unchanged.
 */
export type ArchPayloadResult = Omit<ArchComposePayloadResult, 'cwd'>;

// ---------------------------------------------------------------------------
// The selection identities
// ---------------------------------------------------------------------------

// `archGapId` and `parseArchGapId` USED TO BE DEFINED HERE and now live in
// `src/shared/arch-ids.ts`, imported above. The renderer needs the same format
// in order to translate the view's own spelling into it, and it may not import
// a main module, so the format was written out by hand in a second place. One
// file both processes can name is the fix.

/**
 * Which part or promise a verdict is about.
 *
 * The checkers stamp five shapes, being `edge:<id>`, `component:<id>` with an
 * optional `#anchor:<n>`, `#boundary`, `#manifest` or `#freshness` suffix, and
 * either of those behind an `evidence:` prefix. An id in this format matches
 * `ARCH_ID_PATTERN`, so it can hold neither a colon nor a hash and this split
 * is unambiguous.
 */
export function archSubjectOwner(
  subjectId: string
): { kind: 'component' | 'edge'; id: string } | null {
  const body = subjectId.startsWith('evidence:') ? subjectId.slice(9) : subjectId;
  const head = body.split('#')[0] ?? '';
  if (head.startsWith('component:')) return { kind: 'component', id: head.slice(10) };
  if (head.startsWith('edge:')) return { kind: 'edge', id: head.slice(5) };
  return null;
}

// ---------------------------------------------------------------------------
// The words this module needs and nothing else says
// ---------------------------------------------------------------------------

/**
 * One line of text, with every control character replaced by a space.
 *
 * See the header. The block is one bracketed paste, and an ESC or a carriage
 * return inside it can end the paste early and turn what follows into
 * keystrokes. A space is used rather than a removal so two words never run
 * together and so the length of the line does not depend on what was stripped.
 */
function oneLine(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ');
}

/** A closed set value as a person reads it. `external-service` is two words. */
function plainWords(value: string): string {
  return value.split('-').join(' ');
}

/** The verb one promise kind takes in a sentence. */
function edgeVerb(kind: string): string {
  switch (kind) {
    case 'imports':
      return 'import';
    case 'calls':
      return 'call';
    case 'spawns':
      return 'spawn';
    case 'reads-from':
      return 'read from';
    case 'writes-to':
      return 'write to';
    case 'emits':
      return 'emit';
    case 'deploys-to':
      return 'deploy to';
    default:
      return 'authenticate with';
  }
}

/** The rule as a person reads it. `must-not` is two words and never a hyphen. */
function ruleWords(rule: string): string {
  if (rule === 'must-not') return 'must not';
  return rule;
}

/** One promise, as a sentence rather than as three fields. */
function edgeSentence(edge: ArchEdge, nameOf: (id: string) => string): string {
  return `${nameOf(edge.from)} ${ruleWords(edge.rule)} ${edgeVerb(edge.kind)} ${nameOf(edge.to)}`;
}

/** What one verdict subject is about, in words. */
function subjectPhrase(
  subjectId: string,
  parts: Map<string, ArchComponent>,
  edges: Map<string, ArchEdge>,
  nameOf: (id: string) => string
): string {
  const evidence = subjectId.startsWith('evidence:');
  const body = evidence ? subjectId.slice(9) : subjectId;
  const hash = body.indexOf('#');
  const tail = hash === -1 ? '' : body.slice(hash + 1);
  const owner = archSubjectOwner(subjectId);
  let base: string;
  if (owner === null) base = subjectId;
  else if (owner.kind === 'edge') {
    const edge = edges.get(owner.id);
    base = edge === undefined ? owner.id : edgeSentence(edge, nameOf);
  } else {
    const part = parts.get(owner.id);
    const name = oneLine(part === undefined ? owner.id : part.name);
    if (tail.startsWith('anchor:')) {
      const index = Number(tail.slice(7));
      const anchor = part?.anchors[index];
      base =
        anchor === undefined
          ? `an anchor of ${name}`
          : `the anchor "${oneLine(anchor)}" of ${name}`;
    } else if (tail === 'boundary') base = `the closed boundary of ${name}`;
    else if (tail === 'manifest') base = `${name} as a declared dependency`;
    else base = name;
  }
  if (!evidence) return base;
  const index = Number(tail);
  return `evidence ${String(Number.isNaN(index) ? 1 : index + 1)} for ${base}`;
}

// ---------------------------------------------------------------------------
// The composer
// ---------------------------------------------------------------------------

/** Sorted, de-duplicated, and never dependent on the order a person clicked in. */
function canonical(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}

/** A freshness verdict is a sentence about age and never a claim that can break. */
function isFreshnessSubject(subjectId: string): boolean {
  return subjectId.endsWith('#freshness');
}

/** Compose one scope. Pure, and byte for byte repeatable for the same input. */
export function composeArchPayload(input: ArchPayloadInput): ArchPayloadResult {
  const { document, trackedFiles, selection } = input;
  const parts = new Map(document.components.map((c) => [c.id, c]));
  const edges = new Map(document.edges.map((e) => [e.id, e]));
  const layerName = new Map(
    (document.contract?.layers ?? []).map((l) => [l.id, l.name])
  );
  const nameOf = (id: string): string => oneLine(parts.get(id)?.name ?? id);
  const behindOf = new Map(input.freshness.map((f) => [f.componentId, f.commitsBehind]));
  const verdictBySubject = new Map(input.verdicts.map((v) => [v.subjectId, v]));

  const unknownIds: string[] = [];
  const selectedIds = canonical(selection.componentIds).filter((id) => {
    if (parts.has(id)) return true;
    // An id the caller invented is echoed back, so it goes through the same
    // strip every other value that leaves this module goes through.
    unknownIds.push(oneLine(id));
    return false;
  });
  const selectedSet = new Set(selectedIds);

  // The gaps a person picked, resolved against the contract and sorted.
  const pickedGaps: { componentId: string; index: number; text: string }[] = [];
  for (const gapId of canonical(selection.gapIds)) {
    const parsed = parseArchGapId(gapId);
    const text = parsed === null ? undefined : parts.get(parsed.componentId)?.gaps[parsed.index];
    if (parsed === null || text === undefined) {
      unknownIds.push(oneLine(gapId));
      continue;
    }
    pickedGaps.push({ componentId: parsed.componentId, index: parsed.index, text });
  }
  const pickedGapKeys = new Set(pickedGaps.map((g) => archGapId(g.componentId, g.index)));

  const pickedVerdictIds = canonical(selection.verdictIds).filter((id) => {
    if (verdictBySubject.has(id)) return true;
    unknownIds.push(oneLine(id));
    return false;
  });

  // The promises, split into the ones wholly inside the scope and the ones
  // that leave it or enter it. A crossing promise is the reason this block
  // beats a hand typed one: a person naming a part rarely remembers what is
  // promised about its edges.
  const interior: ArchEdge[] = [];
  const crossing: { edge: ArchEdge; direction: 'out of' | 'into' }[] = [];
  for (const edge of [...document.edges].sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const fromIn = selectedSet.has(edge.from);
    const toIn = selectedSet.has(edge.to);
    if (fromIn && toIn) interior.push(edge);
    else if (fromIn) crossing.push({ edge, direction: 'out of' });
    else if (toIn) crossing.push({ edge, direction: 'into' });
  }
  const inScopeEdgeIds = new Set([
    ...interior.map((e) => e.id),
    ...crossing.map((c) => c.edge.id)
  ]);

  // Which verdicts this scope is about. A freshness row is not one of them: it
  // is a sentence about age, the strip does not count it, and the freshness
  // section below says it once for the whole scope instead of once per part.
  const inScope = (verdict: ArchVerdict): boolean => {
    if (isFreshnessSubject(verdict.subjectId)) return false;
    const owner = archSubjectOwner(verdict.subjectId);
    if (owner === null) return false;
    return owner.kind === 'component'
      ? selectedSet.has(owner.id)
      : inScopeEdgeIds.has(owner.id);
  };
  const scopeVerdicts = [...input.verdicts]
    .filter(inScope)
    .sort((a, b) => (a.subjectId < b.subjectId ? -1 : 1));
  const otherPicked = pickedVerdictIds
    .filter((id) => !scopeVerdicts.some((v) => v.subjectId === id))
    .filter((id) => !isFreshnessSubject(id))
    .flatMap((id) => {
      const verdict = verdictBySubject.get(id);
      return verdict === undefined ? [] : [verdict];
    });
  const allVerdicts = [...scopeVerdicts, ...otherPicked];
  const broken = allVerdicts.filter(
    (v) => v.status === 'divergent' || v.status === 'absent'
  );

  // -------------------------------------------------------------------------
  // The block
  // -------------------------------------------------------------------------

  let truncated = false;
  const brokenTargetIds: string[] = [];
  const deadAnchors: { componentId: string; anchor: string }[] = [];
  const proseWithheld: { componentId: string; commitsBehind: number }[] = [];
  const out: string[] = [];

  const commit = input.checkedAtCommit;
  out.push(`Architecture scope from docs/arch in ${oneLine(input.repoName)}.`);
  out.push(
    commit === null || commit.length === 0
      ? 'Nothing has been checked in this repository yet, so every verdict below reads as not checked yet.'
      : `Checked at commit ${oneLine(commit.slice(0, 12))}.`
  );
  out.push(
    'Tortie composed this text from docs/arch and from its own checks. Tortie ' +
      'writes docs/arch only when a person asks it to, and every write lands ' +
      'as an ordinary uncommitted change. Every path is relative to the ' +
      'repository root, no file contents are included, and every line quoted ' +
      `out of docs/arch is marked "${ARCH_UNVERIFIED_MARK}".`
  );

  // ---- the parts -----------------------------------------------------------
  out.push('', 'PARTS');
  if (selectedIds.length === 0) {
    out.push('', '  No part was selected.');
  }
  for (const id of selectedIds) {
    const part = parts.get(id) as ArchComponent;
    const layer = layerName.get(part.layer) ?? part.layer;
    const files = componentFiles(part, trackedFiles);
    const behind = behindOf.get(id) ?? 0;
    const quotable = behind < ARCH_PROSE_MAX_COMMITS_BEHIND;

    out.push('');
    out.push(
      `${nameOf(id)}, a ${plainWords(part.kind)} in the ${oneLine(layer)} layer, ` +
        `${plainWords(part.provenance)}, ${part.boundary} boundary` +
        `${part.deprecated ? ', deprecated' : ''}.`
    );

    if (part.anchors.length === 0) {
      out.push(
        `  It lives outside the tree, so it names no files and there is ` +
          `nothing here to check it against.`
      );
    } else {
      out.push(
        files.length === 1
          ? '  1 file at HEAD.'
          : `  ${String(files.length)} files at HEAD.`
      );
      const shown = files.slice(0, ARCH_PAYLOAD_MAX_FILES_PER_PART);
      for (const path of shown) out.push(`    ${oneLine(path)}`);
      if (files.length > shown.length) {
        truncated = true;
        out.push(
          `    and ${String(files.length - shown.length)} more files under this part.`
        );
      }
      for (const anchor of [...part.anchors].sort()) {
        if (matchAnchor(anchor, trackedFiles).length > 0) continue;
        // STRIPPED, like every other value that leaves this module. The
        // header says the strip is applied to everything uniformly and this
        // was the one place that was not true: an anchor reaches the renderer
        // inside this field with whatever the contract file put in it.
        deadAnchors.push({ componentId: id, anchor: oneLine(anchor) });
        out.push(`    The anchor "${oneLine(anchor)}" matches no tracked file at HEAD.`);
      }
      if (files.length === 0) {
        brokenTargetIds.push(id);
        out.push(
          `    THIS PART RESOLVES TO NOTHING AT HEAD. It may have moved or ` +
            `been deleted, or the pattern may have a typo.`
        );
      }
    }

    if (quotable) {
      if (part.description.length > 0) {
        out.push(`  Description, ${ARCH_UNVERIFIED_MARK}. ${oneLine(part.description)}`);
      }
      for (const [index, gap] of part.gaps.entries()) {
        if (pickedGapKeys.has(archGapId(id, index))) continue;
        out.push(`  Known gap, ${ARCH_UNVERIFIED_MARK}. ${oneLine(gap)}`);
      }
    } else if (part.description.length > 0 || part.gaps.length > 0) {
      proseWithheld.push({ componentId: id, commitsBehind: behind });
      out.push(
        `  What the contract says about this part is not quoted here. ` +
          `${String(behind)} commits have landed under it since the contract ` +
          `last changed, so that text predates the code and Tortie will not ` +
          `present it as current.`
      );
    }

    // The verdicts about this part itself, so a reader sees them beside it.
    const own = scopeVerdicts.filter((v) => {
      const owner = archSubjectOwner(v.subjectId);
      return owner !== null && owner.kind === 'component' && owner.id === id;
    });
    for (const verdict of own) {
      out.push(`  ${verdictLine(verdict, parts, edges, nameOf)}`);
    }
  }

  // ---- the promises --------------------------------------------------------
  if (interior.length > 0) {
    out.push('', 'PROMISES INSIDE THIS SCOPE');
    out.push('');
    for (const edge of interior) {
      out.push(`  ${edgeSentence(edge, nameOf)}, checked by ${plainWords(edge.checker)}.`);
      out.push(`    ${promiseVerdictLine(edge, verdictBySubject)}`);
      for (const line of edgeProse(edge, behindOf)) out.push(`    ${line}`);
    }
  }
  if (crossing.length > 0) {
    out.push('', 'PROMISES THAT CROSS THIS SCOPE');
    out.push('');
    for (const { edge, direction } of crossing) {
      const other = direction === 'out of' ? edge.to : edge.from;
      out.push(
        `  ${edgeSentence(edge, nameOf)}, checked by ${plainWords(edge.checker)}. ` +
          `CROSSING ${direction} this scope, the other end is ${nameOf(other)}.`
      );
      out.push(`    ${promiseVerdictLine(edge, verdictBySubject)}`);
      for (const line of edgeProse(edge, behindOf)) out.push(`    ${line}`);
    }
  }

  // ---- what broke ----------------------------------------------------------
  out.push('', 'WHAT BROKE');
  out.push('');
  if (broken.length === 0) {
    out.push('  Nothing in this scope broke, of what Tortie can check.');
  }
  for (const verdict of broken) {
    out.push(
      `  ${subjectPhrase(verdict.subjectId, parts, edges, nameOf)}: ` +
        `${archVerdictWord(verdict.status)}, ${archCoverageWord(verdict.coverage)}.`
    );
    if (verdict.reason !== null && verdict.reason.length > 0) {
      out.push(`    ${oneLine(verdict.reason)}`);
    }
    const quote = verdict.subjectId.startsWith('evidence:');
    const places = [...(verdict.offending ?? [])].sort(compareOffending);
    const shown = places.slice(0, ARCH_PAYLOAD_MAX_OFFENDING);
    for (const place of shown) {
      const because = acceptedBecause(input, place);
      // An evidence offence is a QUOTE that no longer reads as written, and it
      // is not an import, so it does not get the import sentence. The quoted
      // words are what the contract holds rather than what the file holds, and
      // saying "resolves to" about them would be a plain lie.
      const body = quote
        ? `${oneLine(place.fromPath)} line ${String(place.line)}, where the ` +
          `contract quotes "${oneLine(place.specifier)}", ${ARCH_UNVERIFIED_MARK}.`
        : `${oneLine(place.fromPath)} line ${String(place.line)} names ` +
          `"${oneLine(place.specifier)}", which resolves to ` +
          `${oneLine(place.toPath)}.`;
      out.push(
        `    ${body}` +
          (because === null
            ? ''
            : ` Accepted on purpose, ${ARCH_UNVERIFIED_MARK}. ${oneLine(because)}`)
      );
    }
    if (places.length > shown.length) {
      truncated = true;
      out.push(`    and ${String(places.length - shown.length)} more places.`);
    }
  }

  // ---- the verdicts a person picked from outside the scope ------------------
  // Everything about a selected part or a promise that touches one is already
  // above, beside the thing it is about. This section exists for the one case
  // nothing else covers, being a verdict a person picked whose subject is not
  // in the scope at all. A broken one and an unchecked one are gathered below
  // with their reasons, so only the ones that hold are listed here.
  const pickedHolds = otherPicked.filter((v) => v.status === 'convergent');
  const unchecked = allVerdicts.filter((v) => v.status === 'unverifiable');
  if (pickedHolds.length > 0) {
    out.push('', 'OTHER PICKED PROMISES');
    out.push('');
    for (const verdict of pickedHolds) {
      out.push(`  ${verdictLine(verdict, parts, edges, nameOf)}`);
    }
  }
  if (unchecked.length > 0) {
    out.push('', 'WHAT CANNOT BE CHECKED');
    out.push('');
    for (const verdict of unchecked) {
      out.push(`  ${verdictLine(verdict, parts, edges, nameOf)}`);
      if (verdict.reason !== null && verdict.reason.length > 0) {
        out.push(`    ${oneLine(verdict.reason)}`);
      }
    }
  }

  // ---- the stapled gaps ----------------------------------------------------
  if (pickedGaps.length > 0) {
    out.push('', 'KNOWN GAPS THAT WERE PICKED');
    out.push('');
    for (const gap of pickedGaps) {
      const behind = behindOf.get(gap.componentId) ?? 0;
      const age =
        behind < ARCH_PROSE_MAX_COMMITS_BEHIND
          ? ''
          : ` ${String(behind)} commits have landed under this part since it was written.`;
      out.push(
        `  ${nameOf(gap.componentId)}, ${ARCH_UNVERIFIED_MARK}. ` +
          `${oneLine(gap.text)}${age}`
      );
    }
  }

  // ---- freshness -----------------------------------------------------------
  const scopeFreshness = input.freshness.filter((f) => selectedSet.has(f.componentId));
  out.push('', 'FRESHNESS');
  out.push('');
  out.push(
    `  ${archFreshnessRibbon(
      [...scopeFreshness].sort((a, b) => (a.componentId < b.componentId ? -1 : 1)),
      nameOf
    )}`
  );
  const unresolved = archUnresolvedSentence(
    input.counts.unresolvedImports,
    input.counts.totalImports
  );
  if (unresolved !== null) out.push(`  ${unresolved}`);

  // ---- the closing refusal -------------------------------------------------
  out.push('', 'WHAT THIS IS NOT');
  out.push('');
  out.push(
    '  It is not a review and it is not permission. Tortie checked the ' +
      'promises it can check and said so above, and everything marked ' +
      `"${ARCH_UNVERIFIED_MARK}" is somebody's words that nothing has checked.`
  );

  const text = `${out.join('\n')}\n`;
  return {
    text,
    bytes: Buffer.byteLength(text, 'utf8'),
    brokenTarget: brokenTargetIds.length > 0,
    brokenTargetIds,
    deadAnchors,
    proseWithheld,
    unknownIds: canonical(unknownIds),
    truncated,
    counts: {
      parts: selectedIds.length,
      interiorPromises: interior.length,
      crossingPromises: crossing.length,
      verdicts: allVerdicts.length,
      broke: broken.length,
      gaps: pickedGaps.length
    }
  };
}

// ---------------------------------------------------------------------------
// The lines
// ---------------------------------------------------------------------------

/** One verdict as one line, in the person's words and never the machine's. */
function verdictLine(
  verdict: ArchVerdict,
  parts: Map<string, ArchComponent>,
  edges: Map<string, ArchEdge>,
  nameOf: (id: string) => string
): string {
  const phrase = subjectPhrase(verdict.subjectId, parts, edges, nameOf);
  if (verdict.firstCheck) return `${phrase}: not checked yet.`;
  return `${phrase}: ${archVerdictWord(verdict.status)}, ${archCoverageWord(
    verdict.coverage
  )}.`;
}

/** What the last check concluded about one promise, or that nothing has yet. */
function promiseVerdictLine(
  edge: ArchEdge,
  verdictBySubject: Map<string, ArchVerdict>
): string {
  const verdict = verdictBySubject.get(`edge:${edge.id}`);
  if (verdict === undefined) return 'Not checked yet.';
  if (verdict.firstCheck) return 'Not checked yet.';
  return `${verdictClause(verdict.status)}, ${archCoverageWord(verdict.coverage)}.`;
}

/**
 * One verdict as a clause about the promise just named.
 *
 * `archVerdictWord` gives a bare word, which reads as a sentence for two of the
 * four and not for the other two. "This missing" is not English.
 */
function verdictClause(status: string): string {
  switch (status) {
    case 'convergent':
      return 'This holds';
    case 'divergent':
      return 'This broke';
    case 'absent':
      return 'This is missing';
    default:
      return 'This cannot be checked';
  }
}

/**
 * A promise's authored lines, under the two grade rule.
 *
 * A promise has two ends, so the grade is the WORSE of the two. A note about
 * how two parts touch each other stops being trustworthy as soon as either of
 * them has moved.
 */
function edgeProse(edge: ArchEdge, behindOf: Map<string, number>): string[] {
  const behind = Math.max(behindOf.get(edge.from) ?? 0, behindOf.get(edge.to) ?? 0);
  const authored = [
    edge.label === undefined || edge.label.length === 0
      ? null
      : `Label, ${ARCH_UNVERIFIED_MARK}. ${oneLine(edge.label)}`,
    edge.note === undefined || edge.note.length === 0
      ? null
      : `Note, ${ARCH_UNVERIFIED_MARK}. ${oneLine(edge.note)}`
  ].flatMap((line) => (line === null ? [] : [line]));
  if (authored.length === 0) return [];
  if (behind < ARCH_PROSE_MAX_COMMITS_BEHIND) return authored;
  return [
    `What the contract says about this promise is not quoted here. ` +
      `${String(behind)} commits have landed under one of its two parts since ` +
      `the contract last changed.`
  ];
}

/** The baseline reason covering one offending place, or null when none does. */
function acceptedBecause(
  input: ArchPayloadInput,
  place: ArchOffending
): string | null {
  for (const row of input.document.baseline.accepted) {
    if (row.fromPath !== place.fromPath) continue;
    if (row.toPath !== place.toPath) continue;
    return row.because;
  }
  return null;
}

/** One fixed order for offending places, so two runs write them the same way. */
function compareOffending(a: ArchOffending, b: ArchOffending): number {
  if (a.fromPath !== b.fromPath) return a.fromPath < b.fromPath ? -1 : 1;
  if (a.line !== b.line) return a.line - b.line;
  if (a.toPath !== b.toPath) return a.toPath < b.toPath ? -1 : 1;
  return a.specifier < b.specifier ? -1 : a.specifier > b.specifier ? 1 : 0;
}
