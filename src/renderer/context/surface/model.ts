/**
 * The view models the detail surface and the install flow add on top of the
 * object model.
 *
 * The §4 types live in `src/shared/context.ts` and reach this directory through
 * `../model`, which is the context stream's one import point. Nothing here
 * redefines a shape that already exists there. What is here is the material the
 * install path needs and the reader does not: the audit response, the agent
 * picker, the plan main will spawn, and the pin.
 *
 * Nothing in this module is allowed to hold a secret value. Env values reach
 * the surface as key names only, and `./secrets` is the one place that decides
 * what a secret looks like.
 */

import type {
  ContextCategory,
  ContextExecutableScan,
  ContextReloadCell
} from '../model';

// ---------------------------------------------------------------------------
// §10 — live reload, per agent, from registry data
// ---------------------------------------------------------------------------

/** One agent's answer for the category being shown, with a name to print. */
export interface AgentReload {
  agentId: string;
  agentName: string;
  cell: ContextReloadCell;
}

// ---------------------------------------------------------------------------
// §8.3 — session mode
// ---------------------------------------------------------------------------

export interface SessionContext {
  sessionName: string;
  /** Epoch ms. The readout always names the launch time, never "running with". */
  startedAt: number;
}

// ---------------------------------------------------------------------------
// §3.2 — the audit endpoint, which is why the risk can be shown before the
// install control rather than after it
// ---------------------------------------------------------------------------

export type AuditRisk = 'safe' | 'low' | 'medium' | 'high' | 'critical';

export interface ScannerResult {
  risk: AuditRisk;
  /** Socket's alert count. Absent for the scanners that do not report one. */
  alerts?: number;
  /** Socket and ZeroLeaks report a score out of 100. */
  score?: number;
  /** ISO date the scan ran. A stale clean scan is a different claim. */
  analyzedAt?: string;
}

/**
 * `GET add-skill.vercel.sh/audit?source=<owner/repo>&skills=<a,b>`, one record
 * per skill. Four independent scanners, free and unauthenticated. Every field
 * is optional because a scanner that has not looked at this skill is absent
 * from the response, and absent must render as "not scanned" rather than as
 * blank or as safe.
 */
export interface AuditRecord {
  ath?: ScannerResult;
  socket?: ScannerResult;
  snyk?: ScannerResult;
  zeroleaks?: ScannerResult;
}

// ---------------------------------------------------------------------------
// §7.6 — preview mode, the not-installed state of the same surface
// ---------------------------------------------------------------------------

/** One agent the source could be installed for. */
export interface InstallTarget {
  agentId: string;
  agentName: string;
  selected: boolean;
  /**
   * Why this agent cannot be targeted, when it cannot. skills.sh's table has
   * 76 agents and two of Tortie's are not in it, so the row is disabled WITH
   * THE REASON rather than hidden.
   */
  unavailableReason: string | null;
}

/**
 * The cost line. `measured` is the agent's own number; `proxy` is the honest
 * stand-in, and the label says which one it is.
 */
export interface TokenEstimate {
  kind: 'measured' | 'proxy';
  tokens: number | null;
  descriptionBytes: number;
  fileCount: number;
}

/**
 * What the preview card knows about something that is not on disk yet.
 * Every string here is attacker-controlled and renders as plain text. Nothing
 * in this shape is ever passed to a markdown renderer.
 */
export interface PreviewSubject {
  category: ContextCategory;
  name: string;
  /** `owner/repo`, a git URL, or a local directory. */
  source: string;
  /** Registry description. Plain text, never markdown. */
  description: string;
  /** Resolved commit, when the source layer resolved one. */
  commit: string | null;
  /** null renders as "licence unknown", never as blank. */
  license: string | null;
  /** The fetched SKILL.md body, for the scan and the plain-text read. */
  body: string | null;
  /** Precomputed scan, when main already ran it. Falls back to `./executable-scan`. */
  scan: ContextExecutableScan | null;
  /** null renders as "Not scanned", never as blank. */
  audit: AuditRecord | null;
  /** Always-on token cost, when the agent computes one. */
  tokenEstimate: TokenEstimate | null;
}

// ---------------------------------------------------------------------------
// The install plan — what main will actually spawn
// ---------------------------------------------------------------------------

export type InstallOperation =
  'install' | 'remove' | 'update' | 'restore' | 'enumerate';

/**
 * INTEGRATION SEAM. Main builds this and hands it to the renderer BEFORE
 * anything runs; the renderer displays it and hands back its `id` to run it.
 * The renderer never assembles argv itself, because the confirm must show the
 * command that will run and not a second rendering of the same intent.
 *
 * `argv` is everything after the CLI entry point, so the spawned command is
 * `executable cliPath ...argv` with `ELECTRON_RUN_AS_NODE=1`.
 */
export interface InstallPlan {
  id: string;
  operation: InstallOperation;
  /** v1 routes only skills through the CLI. The other four categories do not. */
  category: ContextCategory;
  /** What the user asked for, for the title line. */
  displayName: string;
  source: string;
  scope: 'global' | 'project';
  executable: string;
  cliPath: string;
  argv: readonly string[];
  cwd: string;
  /** Agent ids this run targets. */
  agents: readonly string[];
  /** Variables Tortie adds on top of the inherited login-shell environment. */
  addedEnv: Readonly<Record<string, string>>;
}

/**
 * What Tortie recorded at install, and what it reads back on refresh.
 *
 * `pinnedHash` is whatever the source's own record calls the resolved content:
 * `skillFolderHash` for skills.sh, `sha` for a Claude marketplace,
 * `gitCommitSha` for `installed_plugins.json`. It is NOT compared against
 * `ContextEntry.hash`, which is Tortie's own hash of the files and answers a
 * different question.
 */
export interface PinRecord {
  pinnedHash: string;
  /** The hash read back now. null when it could not be read. */
  currentHash: string | null;
  pinnedAt: number;
}
