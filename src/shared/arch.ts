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

// ---------------------------------------------------------------------------
// The fact base (Phase 257, research 118 §6 and §10 Phase 1), derived like
// the verdicts
// ---------------------------------------------------------------------------
//
// Nothing below is a `docs/arch/` key. A fact is DERIVED from the repository's
// own bytes by a closed rule table in `src/main/arch/facts/`, it lives only in
// Tortie's own disposable `arch.db`, and it never travels with the repository.
// `ARCH_ROW_KEYS` above is untouched, and `npm run conformance:arch` rule 12
// pins it byte for byte so that stays checkable rather than asserted.

/**
 * The eight categories the prototype measured, in the charter's order. A fact
 * outside them is refused WHOLE by the store with the field named, never
 * written under a ninth word.
 */
export const ARCH_FACT_CATEGORIES = [
  'entrypoint',
  'boundary',
  'surface',
  'store',
  'effect',
  'network',
  'gate',
  'test'
] as const;
export type ArchFactCategory = (typeof ARCH_FACT_CATEGORIES)[number];

/**
 * The closed kind set per category. The store refuses a kind outside its
 * category's list the way it refuses a category outside the eight.
 *
 * `boundary` deliberately holds `module-root` BESIDE the six build-and-start
 * kinds rather than folded into one of them: research 118 §7.6 measured the
 * six at 15 of 15 and the module roots at 30 of 30, and on this repository 75
 * of 80 boundary facts are `index.ts` barrels that a union would draw as
 * processes. {@link ARCH_BOUNDARY_START_KINDS} and {@link ARCH_MODULE_ROOT_KIND}
 * are the two halves, and the store exposes one reader for each and NO reader
 * for the union.
 */
export const ARCH_FACT_KINDS: Readonly<Record<ArchFactCategory, readonly string[]>> = {
  entrypoint: [
    'main',
    'by-name',
    'composition-root',
    'package-main',
    'bin',
    'script',
    'package',
    'process',
    'container',
    'ci-job'
  ],
  boundary: ['worker', 'thread', 'process', 'service', 'workspace', 'library', 'module-root'],
  surface: ['http-route', 'ipc-channel', 'cli-command', 'cli-flag', 'job', 'port'],
  store: ['store-write', 'store-def', 'migration'],
  effect: ['spawn', 'fs-write'],
  network: ['client', 'listen'],
  gate: ['auth', 'flag', 'refusal', 'guard'],
  test: ['test-case', 'test-target']
};

/** The six boundary kinds that say what a repository BUILDS and STARTS (15 of 15 judged). */
export const ARCH_BOUNDARY_START_KINDS = [
  'worker',
  'thread',
  'process',
  'service',
  'workspace',
  'library'
] as const;

/** The one boundary kind that says a language's package root is here (30 of 30 judged, five of them test packages). */
export const ARCH_MODULE_ROOT_KIND = 'module-root' as const;

/** One fact as the reader produces it, before it is linked to a file. */
export interface ArchFactDraft {
  category: ArchFactCategory;
  kind: string;
  /** What the fact says, at most {@link ARCH_FACT_LIMITS.maxSubject} characters. */
  subject: string;
  /** 1 based. */
  line: number;
  /** The rule id that produced it, e.g. `surface.ipc.electron`; `+wrap` when only a wrapper reached it. */
  rule: string;
  /** The cited line, trimmed, at most {@link ARCH_FACT_LIMITS.maxEvidence} characters. */
  evidence: string;
}

/** One fact of a repository, joined to the file it was read at. */
export interface ArchFact extends ArchFactDraft {
  /** Repository relative path. */
  file: string;
  /** True when the fact exists only through a wrapper declaration in another file. */
  viaWrapper: boolean;
}

/** The counts a face will need, always with their denominators. */
export interface ArchFactCounts {
  byCategory: Record<ArchFactCategory, number>;
  byRule: Record<string, number>;
  /** Tracked files the fact pass has linked. */
  files: number;
  /** Files the vendor filter refused to read. */
  vendored: number;
  /** Files whose call list hit the worker's ceiling. */
  truncated: number;
  /** Files no rule reads at all. */
  unread: number;
  /** Facts that exist only through a wrapper. */
  wrapFacts: number;
  /** The wrapper map digest the wrap facts were computed under, or null with the pass off. */
  wrapDigest: string | null;
}

/** The two bounds a stored fact row honours. The reader cuts at them; the store refuses past them. */
export const ARCH_FACT_LIMITS = { maxSubject: 160, maxEvidence: 200 } as const;

/**
 * The ANCHOR apis a local wrapper may hide (Phase 257, research 118 §6.3).
 *
 * The key is the inner callee's final segment; the value is which argument of
 * the inner call carries the name. `handle(ipc, 'arch:map', fn)` in this
 * repository's own `src/main/typed-ipc.ts` is the shape: `ipc.handle` is
 * reached with the wrapper's own `channel` parameter, so every call site of
 * `handle` is an IPC registration no rule reading the callee name can see.
 * Measured on this repository 2026-09-10: 0 of 229 channels before the pass,
 * 229 of 229 after it, with zero false positives.
 *
 * WHY IT IS HERE AND NOT IN `src/main/arch/facts/`. The one table is read by
 * two modules on either side of a directory wall: `src/main/symbols/wrappers.ts`
 * walks declarations in the worker and needs the anchor set to mark a hop-1
 * candidate, and `src/main/arch/facts/wrappers.ts` closes the map. The arch
 * directory has ONE door for the rest of main (`assert-import-boundaries.mjs`),
 * so symbols cannot name a file under arch, and the table lives in the leaf
 * both may name. It is names compared against callee text; nothing here can
 * run and nothing here reaches an argv.
 */
export const ARCH_WRAPPER_ANCHORS: Readonly<Record<string, number>> = {
  handle: 0,
  handleOnce: 0,
  on: 0,
  once: 0,
  invoke: 0,
  send: 0,
  addEventListener: 0,
  HandleFunc: 0,
  Handle: 0,
  route: 0,
  get: 0,
  post: 0,
  put: 0,
  patch: 0,
  delete: 0,
  spawn: 0,
  spawnSync: 0,
  exec: 0,
  execFile: 0,
  execFileSync: 0,
  execSync: 0,
  Command: 0,
  run: 0,
  Popen: 0
};

/**
 * The grammars the wrapper pass runs over (Phase 257, research 118 §6.3).
 *
 * Every one of the three clauses the pass needs was measured on this
 * repository's own TypeScript, and §6.3 counted 735 wrapper only facts here
 * against 2 across the eight repositories in the other six families. Grammar
 * ids as strings, because this leaf may not name `src/main/symbols/languages`;
 * `src/main/symbols/wrappers.ts` asks it before it walks a file and
 * `src/main/arch/facts/wrappers.ts` narrows it to the typed list it exports.
 */
export const ARCH_WRAPPER_GRAMMARS: readonly string[] = ['typescript', 'tsx', 'javascript'];

// ---------------------------------------------------------------------------
// Phase 258: the computed evidence ladder (research 118 §7.2)
// ---------------------------------------------------------------------------
// `ArchEvidenceRung` is derived from the const array and nothing else; a
// sixth word cannot be added without moving the array `npm run
// conformance:evidence` rule 1a pins, and no string reaches a rung at run
// time because the ladder's inputs are sets of paths and a graph.

/** The five computed rungs of research 118 §7.2, lowest first. There is no sixth. */
export const ARCH_EVIDENCE_RUNGS = ['off-repo', 'declared', 'composed', 'reached', 'tested'] as const;
export type ArchEvidenceRung = (typeof ARCH_EVIDENCE_RUNGS)[number];

/** One part's rung with the per-file counts behind it, so the hover can say the denominator. */
export interface ArchRungReading {
  rung: ArchEvidenceRung;
  /** Anchors that are tracked files at HEAD. 0 is `off-repo`. */
  anchors: number;
  /** Of those, the ones this build parses (rule P's "source"). */
  parsed: number;
  /** Parsed anchors a walk from the part's seeds reaches. */
  reached: number;
  /** Parsed anchors some file carrying a test fact imports. */
  tested: number;
  /** How many seed files the part's units gave the walk. 0 means nothing recognised starts it. */
  seeds: number;
}

// ---------------------------------------------------------------------------
// Phase 259: the semantic reading (research 118 §7.1 and §7.3, SPEC §2, §3.4)
// ---------------------------------------------------------------------------
// EVERY SHAPE HERE IS DERIVED AND NONE OF THEM IS A ROW KEY. `ARCH_ROW_KEYS`
// above is untouched: a model's sentences live in Tortie's own disposable
// `arch.db` and never in `docs/arch/`, so `conformance:arch` rule 12 runs
// unchanged and nothing a model wrote can become part of the format a person
// commits.
//
// THE LADDER IS NOT A TRUTH SCALE. A grade says how rare it is to land within
// three lines of a fact by chance, and nothing else. Every rate the face draws
// carries the share the same files would give at random, which is why
// `ArchRateReading` has no room for a rate without its floor.

/**
 * How far a citation may sit from the fact that backs it, in lines.
 *
 * ONE constant, read by the grader in main and by the floor computed beside
 * every rate, so an ablation of it moves both together (SPEC §2.3).
 */
export const ARCH_CITE_SLACK = 3;

/**
 * The four grades, rarest first (SPEC §2.3). Measured floors over the hand
 * pass's nineteen cited files: `gate` 0.1%, any other fact 2.3%, a
 * declaration 21.9%. `resolves` means the line is here and nothing was found
 * at it, which is the weakest thing a citation can be without being broken.
 */
export const ARCH_CITE_GRADES = ['gate', 'call-site', 'declaration', 'resolves'] as const;
export type ArchCiteGrade = (typeof ARCH_CITE_GRADES)[number];

/** The seven claim fields, in the order the answer must be written in (SPEC §1.4). */
export const ARCH_CLAIM_FIELDS = [
  'name',
  'receives',
  'does',
  'returns',
  'runsIn',
  'keeps',
  'limit'
] as const;
export type ArchClaimField = (typeof ARCH_CLAIM_FIELDS)[number];

/** The four words a gate claim may answer with, and no fifth. */
export const ARCH_GATE_ANSWERS = ['proceeds', 'stops', 'uncertain', 'detected'] as const;
export type ArchGateAnswer = (typeof ARCH_GATE_ANSWERS)[number];

/** One citation as a model writes it: `path:line`, and why that line shows it. */
export interface ArchSemanticCite {
  at: string;
  why: string;
}

/**
 * One citation as the face draws it: where it points, why, how it graded, and
 * the fact the grade came from so a hover can name it.
 *
 * `dead` is the drift fingerprint's answer (SPEC §3.3): the file moved and no
 * row with the same kind and subject is in it any more. A dead citation makes
 * its claim stale; nothing is deleted and the sentence does not change.
 */
export interface ArchCiteReading extends ArchSemanticCite {
  /** Repository relative path, the half of `at` before the colon. */
  relPath: string;
  /** 1 based, the half of `at` after the colon. */
  line: number;
  grade: ArchCiteGrade;
  /** The fact within the slack, or null at `resolves`. */
  factKind: string | null;
  factSubject: string | null;
  factLine: number | null;
  dead: boolean;
}

/** One model-written sentence about one field, with its graded citations. */
export interface ArchClaimReading {
  claimId: string;
  field: ArchClaimField;
  text: string;
  cites: readonly ArchCiteReading[];
  /** A citation of this claim died. The sentence stays and the chip turns. */
  stale: boolean;
  /** Which citation died, or null while the claim is current. */
  staleReason: string | null;
  /** The agent that wrote it, for the `read by` label. Never drawn as an authority. */
  agentId: string;
}

/** One rule P box as the model read it. `id` is the map's own box id. */
export interface ArchPartReading {
  id: string;
  /**
   * The model's own name for the part, or null when nothing has read it.
   *
   * IT IS NOT THE LABEL THE MAP DRAWS. The box keeps the computed label it
   * has always had, because a part renamed by a model keeps every chip it
   * had (research 118 §6.4) and the map is the computed half of this pane.
   */
  name: string | null;
  /** The claims that stood, at most one per field, in {@link ARCH_CLAIM_FIELDS} order. */
  claims: readonly ArchClaimReading[];
}

/** One gate the model wrote a reason for, beside the computed rows. */
export interface ArchGateReading {
  gateId: string;
  partId: string;
  question: string;
  answer: ArchGateAnswer;
  because: string;
  cites: readonly ArchCiteReading[];
  stale: boolean;
  staleReason: string | null;
  agentId: string;
}

/** One numbered step of a journey: which part, what happens, and the backing. */
export interface ArchJourneyStepReading {
  seq: number;
  partId: string;
  label: string;
  cites: readonly ArchCiteReading[];
  stale: boolean;
  staleReason: string | null;
}

/**
 * One journey. `contract` is a flow a person committed under
 * `docs/arch/flows/` and it is drawn FIRST and never overwritten; `model` is
 * one an agent read.
 */
export interface ArchJourneyReading {
  journeyId: string;
  name: string;
  source: 'model' | 'contract';
  /** The agent that read it, or null for a journey out of the contract. */
  agentId: string | null;
  steps: readonly ArchJourneyStepReading[];
}

/**
 * The backing of one scope, WITH the share the same files would give at
 * random. There is no field for a rate without its floor, which is research
 * 118 §7.3's ruling made structural rather than remembered.
 *
 * `floorWithin` and `floorLines` are LINE COUNTS: of `floorLines` lines in the
 * cited files, `floorWithin` are within {@link ARCH_CITE_SLACK} of an admitted
 * row. The chance count a face draws is `total` times that share.
 */
export interface ArchRateReading {
  /** `repo`, or `part:<id>`. */
  scope: string;
  backed: number;
  total: number;
  floorWithin: number;
  floorLines: number;
  byGrade: Readonly<Record<ArchCiteGrade, number>>;
  /** The same line counts per grade, so a shaped question's floor is drawn beside it. */
  floorByGrade: Readonly<Record<ArchCiteGrade, number>>;
  /** Gate claims whose citation set holds a `gate` graded row, and how many there are. */
  gateShaped: number;
  gateClaims: number;
}

/**
 * One run as the face reports it. THERE IS NO COST FIELD: claude's figure is
 * recorded in the measurement and codex reports none at all, so a number that
 * exists for one agent and not the other is never drawn (SPEC §9 limit 7).
 */
export interface ArchSemanticRunFace {
  runId: string;
  agentId: string;
  model: string;
  /** The part this ask was about, or null for the journey ask. */
  partId: string | null;
  verdict: string;
  reason: string | null;
  wallMs: number;
  claims: number;
  rowsDropped: number;
  startedAt: number;
}
