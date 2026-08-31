/**
 * The standing contract, as pure data (Phase 63, research 49 section 4.3).
 *
 * A person writes `docs/arch/` by hand, or has their own agent write it in a
 * session they started. It says what the project is made of and what the parts
 * promise each other. Tortie reads it, checks the promises it can check, and
 * says which ones hold. Since Phase 158 Tortie also writes these files, on a
 * person's own gesture and through exactly one writer module
 * (`src/main/arch/enrich/write.ts`): the deterministic skeleton, and a
 * validated enrichment a confirmed agent answered. Every write is a compiled
 * path and lands as an ordinary uncommitted change in Source Control.
 *
 * ## What this file is, and what it is not
 *
 * It is pure data and pure patterns, in the shape `@shared/machines` already
 * uses. It imports nothing, it names no browser type, and it holds no logic.
 * The hand written validator is in `src/main/arch/validate.ts` and the field
 * checks it is built from are in `src/main/arch/schema.ts`.
 *
 * It is not the verdicts. A verdict is derived, it lives only in Tortie's own
 * disposable database, and it never travels with the repository.
 *
 * ## The refusal that governs every field name below
 *
 * `docs/arch/` is a repository local directory. It arrives with a `git pull`,
 * written by whoever last pushed, which is exactly the case CLAUDE.md refusal 8
 * exists to stop. Research 66 section 6.1 ruled on the same shape for
 * `.tortie/`, and the ruling is that such a directory may carry identity and
 * presentation and may never name anything Tortie runs.
 *
 * So no field here names a program, a command, an argument, a path to an
 * executable, a network host or a script, and none ever will. The one field
 * that decides what code runs is `checker`, and it is a closed set of five
 * words that select between checkers the compiled world already contains. That
 * is the charter's own boundary sentence working as intended. `ARCH_ROW_KEYS`
 * below is the complete accepted key set, and `npm run conformance:arch` pins
 * it byte for byte, so a later round cannot add a field that names something to
 * run without the gate saying so.
 *
 * ## The two rules that exist because git reads its own argv
 *
 * A path or a glob beginning with `-` would be read by git as an option rather
 * than as a path. Every path rule refuses one, and the validator names the
 * reason when it drops the row. That refusal is half of the argv defense in
 * `src/main/arch/argv-guard.ts`, and it is what lets the Zen say that nothing
 * Tortie draws starts a process on its own.
 *
 * A path holding a control character is refused too. Evidence reads go to
 * `git cat-file --batch`, whose request protocol is one request per line, so a
 * newline inside a path would be read as the start of a second request.
 */

// ---------------------------------------------------------------------------
// Where the contract lives
// ---------------------------------------------------------------------------

/** The directory, relative to the repository root. Tracked, and reviewed in the same diff as the code. */
export const ARCH_DIR = 'docs/arch';

/** The four files this build reads, relative to {@link ARCH_DIR}. */
export const ARCH_FILES = {
  contract: 'contract.json',
  components: 'components',
  edges: 'edges.json',
  baseline: 'baseline.json',
  /** Reserved. Phase 63 reads no flow file, and the field that names them is validated. */
  flows: 'flows'
} as const;

/** The schema number this build reads. An unknown version fails the load with a named error. */
export const ARCH_VERSION = 1;

/** Every schema version this build reads. Growth is a version bump with a converter, never an appended optional field. */
export const ARCH_ACCEPTED_VERSIONS: readonly number[] = [1];

// ---------------------------------------------------------------------------
// The patterns
// ---------------------------------------------------------------------------

/** An id. Kebab case, and it is the identity every verdict keys on, so it is never reused. */
export const ARCH_ID_PATTERN = '^[a-z][a-z0-9-]{0,63}$';

/**
 * A blob object name. Forty hex characters, and nothing else is ever sent to
 * git. It travels on stdin, never on argv: `src/main/arch/argv-guard.ts`
 * composes twelve compiled in words and nothing else, and the object name
 * pattern it once accepted there was removed with the freshness range that was
 * the only thing wanting it.
 */
export const ARCH_OID_PATTERN = '^[0-9a-f]{40}$';

// ---------------------------------------------------------------------------
// The closed sets
// ---------------------------------------------------------------------------

/** How hard the contract judges. `not-wrong` is the default and it counts unmapped code rather than failing it. */
export const ARCH_STRICTNESS = ['not-wrong', 'complete'] as const;
export type ArchStrictness = (typeof ARCH_STRICTNESS)[number];

/** What a component draws as. */
export const ARCH_COMPONENT_KINDS = [
  'component',
  'store',
  'process',
  'external-service',
  'platform'
] as const;
export type ArchComponentKind = (typeof ARCH_COMPONENT_KINDS)[number];

/** The two kinds that may carry no anchors, because they live outside the tree. */
export const ARCH_ANCHORLESS_KINDS: readonly ArchComponentKind[] = [
  'external-service',
  'platform'
];

/** Where a part came from. The nine categories research 49 section 9.4 found in the operator's own corpus. */
export const ARCH_PROVENANCE = [
  'first-party',
  'vendored',
  'package',
  'native',
  'spawned-tool',
  'external-api',
  'data-store',
  'generated',
  'platform'
] as const;
export type ArchProvenance = (typeof ARCH_PROVENANCE)[number];

/** The corpus's own verbs, research 49 section 9.3. Containment is structure and is never an edge, so it cannot dangle. */
export const ARCH_EDGE_KINDS = [
  'imports',
  'calls',
  'spawns',
  'reads-from',
  'writes-to',
  'emits',
  'deploys-to',
  'authenticates-with'
] as const;
export type ArchEdgeKind = (typeof ARCH_EDGE_KINDS)[number];

/** The promise itself. */
export const ARCH_EDGE_RULES = ['must', 'may', 'must-not'] as const;
export type ArchEdgeRule = (typeof ARCH_EDGE_RULES)[number];

/**
 * Which compiled in checker judges this promise.
 *
 * This is the only field in the whole format that decides what code runs, and
 * it selects from five words this build already contains. It can never name a
 * program, because there is nothing here for a program name to be written into.
 */
export const ARCH_CHECKERS = [
  'imports',
  'manifest',
  'glob',
  'evidence',
  'none'
] as const;
export type ArchChecker = (typeof ARCH_CHECKERS)[number];

/** The three drawing grammars a flow may use. Reserved in Phase 63, validated and not drawn. */
export const ARCH_FLOW_SHAPES = ['pipeline', 'sequence', 'states'] as const;
export type ArchFlowShape = (typeof ARCH_FLOW_SHAPES)[number];

/** What a check concluded. */
export const ARCH_VERDICT_STATUSES = [
  'convergent',
  'divergent',
  'absent',
  'unverifiable'
] as const;
export type ArchVerdictStatus = (typeof ARCH_VERDICT_STATUSES)[number];

/**
 * How much of the claim the checker actually reached.
 *
 * A behavioural edge tops out at `partly-checked` forever. The checker proves
 * the quoted code still sits where the author said it sits. It does not prove
 * the behaviour, and the prose panel says so in one sentence.
 */
export const ARCH_COVERAGES = ['checked', 'partly-checked', 'unverifiable'] as const;
export type ArchCoverage = (typeof ARCH_COVERAGES)[number];

/** The edge kinds a checker can ever prove outright. Everything else tops out at `partly-checked`. */
export const ARCH_STRUCTURAL_EDGE_KINDS: readonly ArchEdgeKind[] = ['imports'];

// ---------------------------------------------------------------------------
// The limits
// ---------------------------------------------------------------------------

/** Every bound the validator enforces, in one place a person can read. */
export const ARCH_LIMITS = {
  maxSubject: 120,
  maxName: 40,
  maxDescription: 500,
  maxLabel: 24,
  maxNote: 500,
  maxQuote: 200,
  maxGap: 500,
  maxBecause: 300,
  maxPath: 512,
  /**
   * How many wildcards one anchor may hold, counting `**` as one.
   *
   * It is a bound on the MATCHER rather than on expressiveness. An anchor is
   * matched by a scan whose cost is the number of tokens times the length of
   * the path, so this caps that cost at the format layer where a person gets a
   * sentence naming the field instead of a screen that has stopped repainting.
   * Eight is well past anything a real anchor needs: `src/**\/*.ts` holds two.
   */
  maxAnchorWildcards: 8,
  maxId: 64,
  minLayers: 3,
  maxLayers: 6,
  maxComponents: 400,
  maxEdges: 2000,
  maxAnchors: 64,
  maxEvidence: 64,
  maxGaps: 32,
  maxFlows: 64,
  maxAccepted: 2000,
  minFlowSteps: 4,
  maxFlowSteps: 13
} as const;

/** The guidance the skeleton writes into the draft, from research 49 fix 18. */
export const ARCH_PROMISE_GUIDANCE = { min: 5, max: 10 } as const;

// ---------------------------------------------------------------------------
// The records
// ---------------------------------------------------------------------------

/** One band of the top level drawing. */
export interface ArchLayer {
  id: string;
  name: string;
  order: number;
}

/** `docs/arch/contract.json`. */
export interface ArchContract {
  version: number;
  subject: string;
  strictness: ArchStrictness;
  layers: ArchLayer[];
  /** Ids of files under `docs/arch/flows/`. Reserved in Phase 63. */
  flows: string[];
}

/**
 * A quoted span backing a claim.
 *
 * The check is a substring test against the file at HEAD, never against the
 * recorded blob, because a quote inside an immutable blob can never fail. The
 * oid renders what it looked like when the person wrote it down, and nothing
 * else.
 */
export interface ArchEvidence {
  path: string;
  blobOid?: string;
  lineStart: number;
  lineEnd: number;
  quote: string;
}

/** One file under `docs/arch/components/`, so two people editing two parts do not conflict. */
export interface ArchComponent {
  id: string;
  name: string;
  kind: ArchComponentKind;
  layer: string;
  provenance: ArchProvenance;
  anchors: string[];
  boundary: 'closed' | 'open';
  description: string;
  evidence: ArchEvidence[];
  deprecated: boolean;
  gaps: string[];
}

/** One promise, in `docs/arch/edges.json`. */
export interface ArchEdge {
  id: string;
  from: string;
  to: string;
  kind: ArchEdgeKind;
  rule: ArchEdgeRule;
  checker: ArchChecker;
  label?: string;
  note?: string;
  evidence: ArchEvidence[];
}

/** One step of a flow. Reserved in Phase 63. */
export interface ArchFlowStep {
  seq: number;
  componentId: string;
  label: string;
  note?: string;
  /** Steps sharing a group run beside each other, which is the thing a drawing in text could not say. */
  group?: string;
  evidence?: ArchEvidence[];
}

/** One file under `docs/arch/flows/`. Reserved in Phase 63. */
export interface ArchFlow {
  id: string;
  name: string;
  shape: ArchFlowShape;
  steps: ArchFlowStep[];
}

/** One divergence a person decided to live with. */
export interface ArchAcceptedRow {
  edgeId?: string;
  fromPath: string;
  toPath: string;
  because: string;
  at: string;
}

/**
 * `docs/arch/baseline.json`, the accepted divergences.
 *
 * The decision to accept is always the person's. Since Phase 158 the typing is
 * not: the accept button on a failing row writes this file through the one
 * channel that can, with the person's own reason on the row. The enrichment
 * pass can never reach it, so an agent still cannot quietly accept its own
 * violation, and accepted rows are always counted in the verdict strip with
 * their `because` text on the face of it.
 */
export interface ArchBaseline {
  accepted: ArchAcceptedRow[];
}

// ---------------------------------------------------------------------------
// What a read produced, and everything Tortie refused on the way
// ---------------------------------------------------------------------------

/**
 * One thing Tortie refused, in a sentence the person can act on.
 *
 * `file` is repository relative, `field` names the field inside it, and
 * `message` says what is wrong and why. A problem is never a crash and never a
 * silent drop.
 */
export interface ArchProblem {
  file: string;
  field: string;
  message: string;
}

/** A whole `docs/arch/` read, with the rows that passed and one problem per row that did not. */
export interface ArchDocument {
  contract: ArchContract | null;
  components: ArchComponent[];
  edges: ArchEdge[];
  baseline: ArchBaseline;
  problems: ArchProblem[];
}

/** True when the read produced a contract this build can draw from. */
export function archDocumentIsUsable(doc: ArchDocument): boolean {
  return doc.contract !== null;
}

// ---------------------------------------------------------------------------
// The derived side, which never travels with the repository
// ---------------------------------------------------------------------------

/** One offending place, re-verified against the current bytes before any row draws. */
export interface ArchOffending {
  fromPath: string;
  toPath: string;
  line: number;
  specifier: string;
  /**
   * The person's own reason, when a `baseline.json` row already accepted
   * this exact offence (Phase 158 fix round). Absent when nobody has. A
   * promise with some offences accepted and some open stays divergent, and
   * this is what lets the failing row show which is which rather than
   * offering an accept control on a line that was accepted a moment ago.
   */
  accepted?: string;
}

/** What one check concluded about one subject. Derived, and it lives only in Tortie's own database. */
export interface ArchVerdict {
  subjectId: string;
  status: ArchVerdictStatus;
  coverage: ArchCoverage;
  offending?: ArchOffending[];
  checkedAtCommit: string;
  generation: number;
  /** A run that never finished renders its unfinished claims as not yet checked, never as stale. */
  firstCheck: boolean;
  reason: string | null;
  durationMs: number;
}

/** How fresh one component is, from the freshness pass. */
export interface ArchFreshness {
  componentId: string;
  commitsBehind: number;
  /** Agents work uncommitted for hours, so a commit only count reads zero during a rewrite. */
  uncommittedFiles: number;
}

/** A language with tracked files whose imports this build does not read. */
export interface ArchUnparsedCount {
  language: string;
  files: number;
}

/**
 * The strip's own counts, reported by coverage so the total cannot flatter.
 *
 * It reads as "12 checked and hold, 1 broke, 21 cannot be checked", and the
 * accepted count is always shown rather than folded into the held count.
 */
export interface ArchCoverageCounts {
  checkedHold: number;
  broke: number;
  cannotCheck: number;
  accepted: number;
  unresolvedImports: number;
  totalImports: number;
  /**
   * The languages the scan had no grammar for, largest first (Phase 178).
   * The resting face says the map is thin out of these rows, whole repo,
   * because until now the sentence lived only behind a drill. OPTIONAL
   * because counts stored by an older build lack it: a missing field reads
   * as the empty list and never as a claim the whole tree was read.
   */
  unparsed?: ArchUnparsedCount[];
}

// ---------------------------------------------------------------------------
// The accepted key set, pinned by the gate
// ---------------------------------------------------------------------------

/**
 * Every key the validator accepts, per record kind.
 *
 * `npm run conformance:arch` compares this against a list written into the gate
 * itself, so adding a field is a deliberate act that shows up in two files. It
 * is what keeps the refusal at the top of this file checkable rather than
 * asserted: none of these names a program, a command, an argument or a host.
 */
export const ARCH_ROW_KEYS = {
  contract: ['version', 'subject', 'strictness', 'layers', 'flows'],
  layer: ['id', 'name', 'order'],
  component: [
    'id',
    'name',
    'kind',
    'layer',
    'provenance',
    'anchors',
    'boundary',
    'description',
    'evidence',
    'deprecated',
    'gaps'
  ],
  evidence: ['path', 'blobOid', 'lineStart', 'lineEnd', 'quote'],
  edge: ['id', 'from', 'to', 'kind', 'rule', 'checker', 'label', 'note', 'evidence'],
  baseline: ['accepted'],
  accepted: ['edgeId', 'fromPath', 'toPath', 'because', 'at'],
  flow: ['id', 'name', 'shape', 'steps'],
  flowStep: ['seq', 'componentId', 'label', 'note', 'group', 'evidence']
} as const;

// ---------------------------------------------------------------------------
// The drift and the change burst (Phase 159), derived like the verdicts
// ---------------------------------------------------------------------------

/**
 * One promise the checkers say is broken RIGHT NOW: a `divergent` or `absent`
 * verdict the strip counts as broke. Wholly accepted divergences are not
 * drift, and accepted offending rows are left out of `offending`.
 */
export interface ArchDriftPromise {
  /** The checker's own subject id, e.g. `edge:app-must-not-store`. */
  subjectId: string;
  status: 'divergent' | 'absent';
  /** The checker's own sentence. */
  reason: string;
  /** The open offences, sorted by path, line, specifier. Never an accepted one. */
  offending: ArchOffending[];
}

/** One quoted span in the contract that no longer reads as written, or whose file is gone. */
export interface ArchDriftQuote {
  subjectId: string;
  /** `component` or `edge`, and the id, of the record that holds the quote. */
  owner: { kind: 'component' | 'edge'; id: string };
  index: number;
  path: string;
  line: number;
  quote: string;
  status: 'divergent' | 'absent';
}

/** One part whose commit count crossed the prose threshold. Commits only, never uncommitted files. */
export interface ArchDriftPart {
  componentId: string;
  commitsBehind: number;
}

/**
 * Everything that drifted, as STATE: what is wrong now, not what moved. The
 * delta prompt is composed from exactly this and nothing else, and `count`
 * is the one number the ribbon's repair control shows on.
 */
export interface ArchDrift {
  promises: ArchDriftPromise[];
  quotes: ArchDriftQuote[];
  parts: ArchDriftPart[];
  /** The parts a repair may touch: every named part plus both ends of every broken promise. Sorted. */
  componentIds: string[];
  /** The promises a repair may touch. Sorted. */
  edgeIds: string[];
  count: number;
}

/** One subject whose status or coverage moved between two checks. Null means it was not there. */
export interface ArchVerdictChange {
  subjectId: string;
  from: ArchVerdictStatus | null;
  to: ArchVerdictStatus | null;
  fromCoverage: ArchCoverage | null;
  toCoverage: ArchCoverage | null;
}

/** One part whose commit count rose between two checks. */
export interface ArchPartChange {
  componentId: string;
  commitsBehindDelta: number;
  uncommittedFiles: number;
}

/** The pure diff of two checks, before it is stamped. */
export interface ArchVerdictDiff {
  verdicts: ArchVerdictChange[];
  parts: ArchPartChange[];
}

/**
 * The last burst of changes one repository's checks produced, stamped with
 * the two generations and commits it sits between. Replaced only when a
 * check moved something, so a quiet check keeps the last burst on screen.
 */
export interface ArchVerdictChanges extends ArchVerdictDiff {
  fromGeneration: number;
  toGeneration: number;
  fromCommit: string | null;
  toCommit: string;
  at: number;
}
