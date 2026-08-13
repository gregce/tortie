/**
 * What a reader produces, before precedence has been applied.
 *
 * A candidate is "agent A can reach thing T at path P with scope S". It is not
 * a row: several candidates collapse into one row when they share an identity,
 * and a candidate that loses its collision becomes a `shadows` entry on the
 * winner rather than a row of its own. Keeping the two shapes separate is what
 * lets the resolver be a pure function that a test can drive with nine
 * candidates and no disk.
 */

import type {
  ContextCategory,
  ContextEvidence,
  ContextExecutableScan,
  ContextPayload,
  ContextProblem,
  ContextScope
} from '@shared/context';
import type { AgentRegistryId } from '@shared/types';
import type { ContextEnv, ContextHomes } from './env';
import type { ContextFs } from './port';

export interface Candidate {
  category: ContextCategory;
  agent: AgentRegistryId;
  /** The name the agent addresses it by. Collisions are matched on this. */
  name: string;
  /**
   * The cross-agent dedupe key. For skills and instructions it is the real
   * path, because one physical file is reachable from up to nine agent
   * directories through symlinks. For the config-backed categories it is the
   * DEFINITION, so two agents that declare the same server the same way are
   * one row and two that declare it differently are two.
   */
  identity: string;
  scope: ContextScope;
  /** Lower wins, from the location's rank. */
  rank: number;
  sourcePath: string;
  realPath: string;
  evidence: ContextEvidence;
  /** Vendor-shipped: rendered in a collapsed group and never counted. */
  bundled: boolean;
  /** The row's one-line summary, already masked. */
  summary: string;
  payload: ContextPayload;
  /** Present when this thing is broken: a missing script, unreadable file. */
  problem: ContextProblem | null;
  /** Switched off in its own config, so it is present and will not run. */
  disabled: boolean;
  /** Set by enterprise policy. Shown, never changed. */
  managed: boolean;
  /** What `hash` is computed over when the caller asks for one. */
  hashTarget: { kind: 'file' | 'dir'; path: string };
  /**
   * Filled only when the caller asked for the executable-content scan. Null
   * means the scan did not run, which must never look like "nothing found".
   */
  executes: ContextExecutableScan | null;
  /** Filled only when the caller asked for the executable-content scan. */
  skillDir?: string;
  skillBody?: { body: string; path: string; startLine: number; hookEvents: string[] };
  /** Position within a merged category, so hooks and instructions keep order. */
  order?: number;
}

/** Everything a reader is handed. Readers never touch `process.env` or `os`. */
export interface ReadContext {
  fs: ContextFs;
  homes: ContextHomes;
  env: ContextEnv;
  /** Absolute project root, or null when the view is showing global scope only. */
  projectRoot: string | null;
  agent: AgentRegistryId;
  /** One bad file must never blank the panel, so problems are collected. */
  addProblem(problem: ContextProblem): void;
  /** Set when a bounded walk stopped early. */
  markTruncated(): void;
  includeNested: boolean;
  /**
   * The install directories of the plugins this agent has ENABLED, filled by
   * the plugin read before the skill read. A plugin cache holds every version
   * ever installed — `vercel/0.43.0`, `vercel/0.45.1`, `vercel/19606ac163fe`
   * all sit side by side on this machine — so a glob over the cache would list
   * the skills of three versions when one is loaded.
   */
  pluginRoots: { name: string; path: string }[];
}
