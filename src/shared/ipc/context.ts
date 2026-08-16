/**
 * Context contract (Phase 22): the launch snapshot read, the Context
 * view's scan, and the skills install path. Moved verbatim from
 * src/shared/ipc.ts (Phase 42 stage 2).
 */

// ---------------------------------------------------------------------------
// APPENDED by Phase 22 (the launch context snapshot) — ONE new invoke channel
// and one optional preload extra. The one existing line touched above is the
// GmuxInvokeChannelMap intersection, exactly as that declaration's own comment
// prescribes.
//
// context:sessionSnapshot — what one session's configuration was at the
//   moment Tortie launched it: the skills, MCP servers, hooks, plugins and
//   instruction files that had resolved for that agent in that directory, each
//   with a content hash. Null when there is no record.
//
//   WHY IT EXISTS. No agent writes down what context it loaded. Research 29
//   §8.1 read 443 `system` records across a 12 MB Claude Code session and not
//   one carries a manifest of it. Tortie owns the launch, so it is the only
//   thing on the machine that can answer "why did that agent not use the skill
//   I just wrote". The honest answer is usually "it started before you wrote
//   it", and this channel is how one keystroke gets it instead of twenty
//   minutes.
//
//   READ ONLY, AND THERE IS NO WRITING COUNTERPART. The snapshot is written
//   once, at launch, by the session create path and the restore path. A
//   channel the renderer could call to write one would turn "written once"
//   from a property into a convention. See src/main/context/snapshot.ts.
//
//   THE COMPARISON IS NOT DONE IN MAIN. The readout marks rows as changed,
//   added or removed by comparing this record against the CURRENT resolved
//   set, and the Context view is already holding that set in order to draw
//   itself. `diffContextSnapshot` in ./context-snapshot.ts is a pure function
//   over two lists, so the renderer calls it rather than making main walk
//   every configuration root a second time.
//   MAIN: src/main/context/session-ipc.ts.
//
// PRELOAD: a top-level `contextSnapshot` function, feature-detected by the
// readout (`typeof window.gmux.contextSnapshot === 'function'`). Without it
// the Context view still lists everything; only the session mode's marks and
// its header line are missing.
// ---------------------------------------------------------------------------

import type { ContextSnapshot } from '../context-snapshot';

/** The one channel the session readout needs. */
export interface ContextSnapshotInvokeChannelMap {
  /** What this session launched with, or null when nothing was recorded. */
  'context:sessionSnapshot': {
    req: [sessionId: string];
    res: ContextSnapshot | null;
  };
}

/**
 * OPTIONAL top-level extra on window.gmux, feature-detected by the readout.
 *
 * It is top-level and a bare function rather than an object with one method,
 * because there is one call and there will not be a second: everything else
 * about a session's context is derived in the renderer from the rows the view
 * already has.
 */
export interface GmuxContextSnapshotExtras {
  contextSnapshot?(sessionId: string): Promise<ContextSnapshot | null>;
}

// ---------------------------------------------------------------------------
// APPENDED by Phase 22 (the Context view and the skills install path) — five
// new invoke channels behind ONE optional preload extra, `window.gmux.context`.
// The one existing line touched above is the GmuxInvokeChannelMap intersection,
// exactly as that declaration's own comment prescribes.
//
// WHY ONE EXTRA WITH FIVE METHODS rather than five top-level functions. The
// snapshot channel above is a bare top-level function because there is one call
// and there will not be a second. These five are one feature and they are
// feature-detected together: a build without the reader has no `context` object
// at all, the view says one sentence and stays mounted, and the write controls
// are absent rather than broken. `contextSnapshot` stays where it is because
// the session readout already ships against it.
//
// context:scan — read every configuration root the registry declares for the
//   selected agents in one project, resolve the collisions per that agent's own
//   precedence model, and return the effective set. Reads files. It spawns no
//   process, opens no socket and returns no credential. Measured at 67 to 85 ms
//   warm for ten agents and five categories, against 2.5 s for `claude mcp
//   list`, which is why nothing here shells out.
//
// context:skillsCapability — is there a usable copy of the bundled skills CLI,
//   and if not, the one line to show. The Skills LIST never depends on this,
//   because the list is a filesystem read. Only the write controls do.
//
// context:skillsPlan — build the whole command without running anything: the
//   argv, the working directory, the shell-quoted command line, the lock-file
//   verdict and whether it needs a network. This is what the confirm shows.
//
// context:skillsRun — the ONLY channel that spawns. It takes the plan back and
//   rebuilds the argv from `plan.operation` before running, so a plan edited on
//   the way through the renderer cannot change what is spawned, and it re-checks
//   the lock guard at the moment of execution because a human takes time and the
//   file can move underneath a confirm that is on screen.
//
// context:hashSkill — re-hash one installed skill directory for the pin
//   re-check. Tortie's own hash of the bytes on disk, which answers "has this
//   changed under me". It is deliberately NOT the CLI's `skillFolderHash`, which
//   records the hash at the source and cannot answer that question.
//
// MAIN: src/main/context/ipc.ts, the one `context:*` registrar. It registers
// `context:sessionSnapshot` too, so there is one registrar rather than two.
// ---------------------------------------------------------------------------

import type { ContextScanInput, ContextScanResult } from '../context';
import type {
  SkillAuditResult,
  SkillPreviewResult,
  SkillSearchResult,
  SkillsCapability,
  SkillsOperation,
  SkillsPlanResult,
  SkillsRunResult
} from '../skills';

/** What one skill directory hashes to right now, for the pin re-check. */
export interface ContextSkillHash {
  /** Absolute path of the skill directory that was hashed. */
  path: string;
  /** Null when the directory could not be read. Never an empty string. */
  hash: string | null;
  /** Names the algorithm, so a record written by an older build is readable. */
  algorithm: string;
  /** Set when the hash could not be taken. One sentence, never a stack trace. */
  problem: string | null;
}

/** Where a skills operation runs. Project scope needs a root; global does not. */
export interface ContextSkillsRunInput {
  operation: SkillsOperation;
  /** Absolute project root. Required for a project-scoped operation. */
  projectRoot?: string;
}

// ---------------------------------------------------------------------------
// The source layer — the three reads that happen BEFORE anything installs
// ---------------------------------------------------------------------------
//
// None of these is a write and none of them touches the CLI. Search uses
// `GET skills.sh/api/search` rather than `skills find`, which has no `--json`
// and posts the user's query to a third party. The audit endpoint has no CLI
// surface at all. The preview read exists because requirement 4 says the
// executable-content scan is SHOWN BEFORE the install control, and the only way
// to scan a SKILL.md before installing it is to read it before installing it.

export interface ContextSkillSearchInput {
  query: string;
  limit?: number;
  owner?: string;
}

export interface ContextSkillAuditInput {
  /** `owner/repo`. */
  source: string;
  skills: string[];
}

export interface ContextSkillPreviewInput {
  source: string;
  skill: string;
}

/**
 * What Tortie recorded when a human approved one install, and what the same
 * directory hashes to now.
 *
 * `pinnedHash` is TORTIE'S OWN hash of the installed folder and never the CLI's
 * `skillFolderHash`. For a GitHub source the lock holds a 40-character git tree
 * id and Tortie holds 64 hex characters of sha256, so comparing them would
 * report "changed" for every such skill forever.
 */
export interface ContextSkillPinCheck {
  path: string;
  name: string;
  source: string;
  pinnedHash: string;
  /** Null when the directory could not be re-read. The gate reads null as CHANGED. */
  currentHash: string | null;
  pinnedAt: number;
  problem: string | null;
}

export interface ContextSkillPinInput {
  /**
   * Absolute path of the installed skill directory.
   *
   * OPTIONAL, and its absence is the normal case right after an install. The
   * renderer's list is a filesystem read that has not happened yet at the
   * moment the pin is written, so asking the renderer for the path there means
   * asking it for a row that does not exist yet. Main resolves it from `name`,
   * `scope` and `projectRoot` instead, using the same home resolution the
   * reader uses, so there is one opinion about where the CLI puts a skill.
   */
  path?: string;
  name: string;
  source: string;
  agents: string[];
  /** Where the install landed. Defaults to global, which is the CLI's default. */
  scope?: 'global' | 'project';
  /** Required for a project-scoped install. */
  projectRoot?: string;
}

export interface ContextInvokeChannelMap {
  'context:scan': { req: [input: ContextScanInput]; res: ContextScanResult };
  'context:skillsCapability': { req: []; res: SkillsCapability };
  'context:skillsPlan': {
    req: [input: ContextSkillsRunInput];
    res: SkillsPlanResult;
  };
  'context:skillsRun': {
    req: [input: ContextSkillsRunInput];
    res: SkillsRunResult;
  };
  'context:hashSkill': { req: [path: string]; res: ContextSkillHash };
  'context:skillsSearch': {
    req: [input: ContextSkillSearchInput];
    res: SkillSearchResult;
  };
  'context:skillsAudit': {
    req: [input: ContextSkillAuditInput];
    res: SkillAuditResult;
  };
  'context:skillsPreview': {
    req: [input: ContextSkillPreviewInput];
    res: SkillPreviewResult;
  };
  'context:skillPins': {
    req: [paths: string[]];
    res: ContextSkillPinCheck[];
  };
  'context:skillPinRecord': {
    req: [input: ContextSkillPinInput];
    res: ContextSkillPinCheck | null;
  };
  'context:skillPinForget': { req: [path: string]; res: void };
}

/**
 * OPTIONAL extra on window.gmux, feature-detected by `context/bridge.ts`.
 *
 * `scan` is the one the view cannot work without, so the bridge tests for it
 * and disables the whole view when it is absent. The four skills methods are
 * tested for separately, because a build that can read configuration but cannot
 * write it is a state the panel renders honestly rather than a broken one.
 */
export interface GmuxContextExtras {
  context?: {
    scan(input: ContextScanInput): Promise<ContextScanResult>;
    skillsCapability(): Promise<SkillsCapability>;
    skillsPlan(input: ContextSkillsRunInput): Promise<SkillsPlanResult>;
    skillsRun(input: ContextSkillsRunInput): Promise<SkillsRunResult>;
    hashSkill(path: string): Promise<ContextSkillHash>;
    /** Discovery. `GET skills.sh/api/search`, never `skills find`. */
    skillsSearch(input: ContextSkillSearchInput): Promise<SkillSearchResult>;
    /** The four-scanner row, fetched before the install control is drawn. */
    skillsAudit(input: ContextSkillAuditInput): Promise<SkillAuditResult>;
    /** The SKILL.md itself, so the executable-content scan can run first. */
    skillsPreview(input: ContextSkillPreviewInput): Promise<SkillPreviewResult>;
    /** Re-hash the pinned skills and hand back both hashes. */
    skillPins(paths: string[]): Promise<ContextSkillPinCheck[]>;
    /** Record the approval hash. Called only after an install exits 0. */
    skillPinRecord(input: ContextSkillPinInput): Promise<ContextSkillPinCheck | null>;
    /** Drop a pin after a remove, so a reinstall is approved afresh. */
    skillPinForget(path: string): Promise<void>;
  };
}

/**
 * Phase 60. The View menu gained "Context". One id on the existing
 * ui:menuAction channel, the same one-member shape PastSessionsMenuActionId
 * and CloneMenuActionId use; older renderers ignore ids they do not know.
 */
export type ContextMenuActionId = 'show-context';
