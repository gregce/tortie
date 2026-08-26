/**
 * The seeding prompt, composed here and nowhere else.
 *
 * ## What this is and what it is deliberately not
 *
 * It is TEXT. This module composes a paragraph a person can read, copy and
 * hand to whichever agent they like. It sends nothing, starts nothing and
 * names no session. "No payload composer and no send to a session" is one of
 * this phase's own refusals, so the gesture ends at the clipboard and at the
 * ordinary new session sheet, which is the same sheet ⌘T opens.
 *
 * ## Why it is byte deterministic
 *
 * The same repository composes the same bytes every time, so a person can diff
 * two runs and a conformance check can compare against a written expectation.
 * Nothing here reads a clock, a random number or any state that moves. The one
 * input is the repository's absolute path, and it appears once.
 *
 * ## Why it names candidate documents rather than one document
 *
 * Research 49 section 9 read thirty architecture documents the operator wrote
 * by hand, and the format is a typed graph serialized to markdown because
 * markdown was the only renderer available. Converting one of those is far
 * cheaper and far more accurate than asking an agent to read a repository
 * cold. But Tortie's own repository has no such document, which research 49
 * correction 10 states plainly: `find . -name 'AS-BUILT*'` returns nothing
 * here, because those thirty documents live in the operator's other
 * repositories. So the prompt names the conventional filenames first, names
 * this repository's own architecture audit second, and falls back to reading
 * the tree only if neither exists.
 *
 * ## The promise count is in the prompt, not only in the empty state
 *
 * An agent told to "write the contract" writes forty promises. The 5 to 10
 * range is the corpus's own number and it belongs in the instruction, because
 * a set nobody can hold in their head is the failure mode this whole surface
 * exists to avoid.
 */

/** The two conventional names, in the order the prompt asks for them. */
const CANDIDATE_DOCS = [
  'AS-BUILT-ARCHITECTURE.md',
  'docs/audits/2026-08-20-electron-typescript-architecture.md'
] as const;

/**
 * Compose the prompt for one repository.
 *
 * The path appears exactly once, at the top, because an agent already running
 * in that folder does not need it repeated and a person pasting this into an
 * agent somewhere else needs it once.
 */
export function seedPromptText(repoPath: string): string {
  return [
    `Write an architecture contract for the repository at ${repoPath}.`,
    '',
    'Read one of these first, in this order, and convert it rather than starting from nothing:',
    ...CANDIDATE_DOCS.map((doc) => `  ${doc}`),
    'If neither exists, read the repository itself.',
    '',
    'Write these files and nothing else:',
    '  docs/arch/contract.json      the subject line, the layers, and whether the contract is strict',
    '  docs/arch/components/<id>.json   one file per component',
    '  docs/arch/edges.json         the promises',
    '',
    'The rules the files have to follow:',
    '',
    '1. A promise names two components and the way they are allowed to touch. Write 5 to 10 of them. Fewer says nothing, and more is a second codebase to keep current.',
    '2. Every component carries a provenance value saying whether it was written here, vendored, a package, native code, a spawned tool, an external API, a data store, generated, or a platform service.',
    '3. Every component carries anchors, which are repository relative globs naming the files it is made of. An anchor never starts with a dash, a slash, a tilde or two dots.',
    '4. A promise about imports can be checked. A promise about calls, spawns, reads, writes, emits, deployment or authentication cannot be, so give it evidence: a path, a line range and a short verbatim quote from that file.',
    '5. Do not invent a promise you cannot point at. A missing promise costs nothing and a wrong one costs trust.',
    '6. Write the gaps too. A sentence saying what is thin is worth more than a sentence saying what is finished.',
    '',
    'Do not write docs/arch/baseline.json. That file records divergences a person has accepted, and only a person adds to it.'
  ].join('\n');
}
