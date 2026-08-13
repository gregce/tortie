/**
 * The skills CLI wire types (Phase 22, research 36).
 *
 * WHY THIS FILE EXISTS. Every skill operation that changes state runs in main,
 * through the bundled CLI. The confirm that a human ticks runs in the renderer.
 * So the plan, the refusal and the result all cross IPC, and `src/shared/ipc.ts`
 * has to name their types. Declaring them here is what stops a second copy of
 * each shape appearing beside the first: `src/main/skills/*` imports these and
 * re-exports them under the same names, so there is exactly ONE declaration of
 * a plan in the tree and the two ends cannot drift.
 *
 * WHAT DOES NOT LIVE HERE. No behaviour. No argv builder, no lock reader, no
 * spawn. This file is types and two frozen constants, because the renderer must
 * never be able to assemble a command: the confirm shows what main built, and
 * `executeSkillsPlan` rebuilds it from the typed operation before anything runs
 * so a forged plan coming back over the bridge cannot change what is spawned.
 */

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

/** Every operation Tortie will ever ask the CLI to perform. */
export type SkillsOperation =
  | { readonly kind: 'version' }
  | { readonly kind: 'listProbe' }
  | { readonly kind: 'enumerate'; readonly source: string }
  | {
      readonly kind: 'install';
      readonly scope: 'global' | 'project';
      readonly source: string;
      readonly skills: readonly string[];
      readonly agents: readonly string[];
    }
  | { readonly kind: 'remove'; readonly skill: string; readonly agent?: string }
  | { readonly kind: 'update'; readonly skill: string | null }
  | { readonly kind: 'restoreProject' };

export type SkillsOperationKind = SkillsOperation['kind'];

/** Global writes land in the user's home; project writes land in the repo. */
export type SkillsScope = 'global' | 'project';

// ---------------------------------------------------------------------------
// Which copy of the CLI runs
// ---------------------------------------------------------------------------

export type SkillsCliSource = 'bundled' | 'installed';

export interface SkillsCompatBand {
  /** Lowest version Tortie will drive, inclusive. */
  readonly min: string;
  /** First major version Tortie will not drive. */
  readonly belowMajor: number;
}

/** How to start one particular copy. Never assembled anywhere else. */
export interface SkillsInvocation {
  /** The executable to spawn. */
  readonly bin: string;
  /** Arguments that come before the CLI's own command arguments. */
  readonly prefixArgs: readonly string[];
  /** Environment additions this copy needs, merged over `skillsEnv`. */
  readonly env: Readonly<Record<string, string>>;
}

export interface SkillsCliCopy {
  readonly source: SkillsCliSource;
  /** The path a human should be shown. The tree entry, or the PATH binary. */
  readonly path: string;
  /** `1.5.22`, or null when the copy exists but would not identify itself. */
  readonly version: string | null;
  /** True when the version parsed AND sits inside the compat band. */
  readonly eligible: boolean;
  /** Why an ineligible copy was refused. Null when it is eligible. */
  readonly refusedBecause: string | null;
  readonly invocation: SkillsInvocation;
}

export interface SkillsCliResolution {
  /** The copy Tortie will actually run, or null when there is none. */
  readonly active: SkillsCliCopy | null;
  /** The copy inside Tortie.app (null when the build shipped without it). */
  readonly bundled: SkillsCliCopy | null;
  /**
   * EVERY copy found, bundled first and then in PATH order, each with its own
   * version, including copies that lost and copies that would not identify
   * themselves. Settings lists these under the winner.
   */
  readonly copies: readonly SkillsCliCopy[];
  /** Where the bundled copy was looked for, said out loud when it is absent. */
  readonly bundledEntryPath: string;
  /** The band that decided eligibility, so Settings can quote it. */
  readonly compatBand: SkillsCompatBand;
}

/**
 * What the panel needs to decide whether its write controls are live, and what
 * one line to show when they are not.
 *
 * The list is never gated on this. It is a filesystem read, so the Skills
 * section renders in full whatever this says. Only the write controls change.
 */
export interface SkillsCapability {
  /** True when a usable copy of the CLI was found. */
  readonly available: boolean;
  readonly copy: SkillsCliCopy | null;
  /** The path the bundled copy was looked for at. Named when it is missing. */
  readonly bundledEntryPath: string;
  /** Every copy found, including the ones that lost, for Settings. */
  readonly copies: readonly SkillsCliCopy[];
  /** The one line the panel shows when `available` is false. Null when it is. */
  readonly unavailableMessage: string | null;
}

// ---------------------------------------------------------------------------
// The lock guard
// ---------------------------------------------------------------------------

export interface LockGuardVerdict {
  /** False means: do not run the write. */
  readonly safe: boolean;
  readonly path: string;
  readonly foundVersion: number | null;
  readonly writesVersion: number;
  /** How many tracked entries would be lost. Zero when the lock is absent. */
  readonly entriesAtRisk: number;
  /** The sentence to show the user. Null when the write is safe. */
  readonly message: string | null;
}

// ---------------------------------------------------------------------------
// Plan, refusal, result
// ---------------------------------------------------------------------------

/** Everything that will happen, before anything happens. */
export interface SkillsPlan {
  readonly operation: SkillsOperation;
  readonly kind: SkillsOperationKind;
  /** What the panel calls this operation, in the user's words. */
  readonly label: string;
  /** The copy that will run it. */
  readonly copy: SkillsCliCopy;
  /** The exact argv, executable first. Reproducible as written. */
  readonly argv: readonly string[];
  /** The CLI's own arguments, without the executable or the entry point. */
  readonly commandArgs: readonly string[];
  readonly cwd: string;
  /**
   * The exact command line that will be executed, shell-quoted. This is the one
   * to show in the confirm and to repeat in any failure, because it is the
   * whole truth about what ran.
   */
  readonly commandLine: string;
  /**
   * The readable form, `skills add owner/repo -g -y …`. Same arguments, without
   * the Electron binary and the entry-point path in front of them. Show it
   * beside `commandLine`, never instead of it.
   */
  readonly displayCommand: string;
  readonly timeoutMs: number;
  readonly requiresNetwork: boolean;
  readonly writes: boolean;
  /** Null for a read-only operation. */
  readonly lockGuard: LockGuardVerdict | null;
}

/** Why no plan could be made. Nothing was spawned. */
export interface SkillsRefusal {
  readonly refused: true;
  readonly reason:
    | 'no-usable-cli'
    | 'bad-command'
    | 'lock-guard'
    | 'missing-project-root';
  /** One sentence for the user. Always names what is wrong and where. */
  readonly message: string;
  /** Set when the refusal is about the lock file. */
  readonly lockGuard?: LockGuardVerdict;
  /** Set for 'no-usable-cli': the path that was tried. */
  readonly triedPath?: string;
}

export type SkillsPlanResult =
  | { readonly refused: false; readonly plan: SkillsPlan }
  | SkillsRefusal;

// ---------------------------------------------------------------------------
// The source layer — the reads that happen before an install
// ---------------------------------------------------------------------------
//
// Declared here for the same reason the plan is: they cross IPC, so
// `src/shared/ipc.ts` has to name them, and one declaration is what stops a
// second copy of each shape appearing in main.

export interface SkillSearchHit {
  /** The registry's own id. A React key and nothing else. */
  readonly id: string;
  /** The skill's slug, which is also what `-s` takes. */
  readonly name: string;
  /** `owner/repo`. What `add` takes as its source. */
  readonly source: string;
  /** Install count, when the registry reported one. */
  readonly installs: number | null;
}

export interface SkillSearchResult {
  readonly query: string;
  readonly hits: SkillSearchHit[];
  /** One sentence when the search could not run. Null on success. */
  readonly problem: string | null;
}

/** One scanner's verdict. Every field optional: an absent scanner is absent. */
export interface SkillScannerResult {
  readonly risk: string;
  readonly alerts?: number;
  readonly score?: number;
  readonly analyzedAt?: string;
}

export interface SkillAuditResult {
  /** Keyed by skill slug. An absent slug means nobody scanned it. */
  readonly records: Record<string, Record<string, SkillScannerResult>>;
  readonly problem: string | null;
}

/**
 * One skill read out of its source WITHOUT installing it, so the
 * executable-content scan can run before the install control is drawn.
 */
export interface SkillPreviewResult {
  readonly source: string;
  readonly name: string;
  /** The `SKILL.md` body verbatim, or null when it could not be read. */
  readonly body: string | null;
  /** Path of the file inside the repository, for the provenance line. */
  readonly path: string | null;
  /** Resolved commit sha, or null when the host did not answer for it. */
  readonly commit: string | null;
  /** Files under `scripts/` in this skill's directory. */
  readonly scriptCount: number;
  /** Every file inside the skill directory, relative to it. */
  readonly files: string[];
  /** One sentence when the preview could not be read. Null on success. */
  readonly problem: string | null;
}

/**
 * What a run produced. Deliberately carries NO skill data: the panel re-reads
 * the filesystem, and there is nothing here it could draw a row from.
 */
export interface SkillsRunResult {
  readonly ok: boolean;
  readonly commandLine: string;
  readonly displayCommand: string;
  readonly cwd: string;
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly spawnError: string | null;
  /** The last lines of stderr, for the message the user is shown. */
  readonly stderrTail: string;
  /** Full stdout. Parsed only for `--version` and `list --json`. */
  readonly stdout: string;
  readonly durationMs: number;
  /** A sentence naming the command and what went wrong. Null on success. */
  readonly failure: string | null;
}
