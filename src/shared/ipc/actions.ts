/**
 * actions:* contract (Phase 46). Four invoke channels and one event, all of
 * them read only. Main spawns the gh CLI; nothing here can write to GitHub.
 */

import type { Unsubscribe } from './base';
import type {
  ActionsJobsInput,
  ActionsJobsResult,
  ActionsRunsInput,
  ActionsUpdate
} from '../actions';

/** Main to renderer: this repository's runs moved. */
export const EVT_ACTIONS_CHANGED = 'actions:changed' as const;

export interface ActionsEventPayloadMap {
  'actions:changed': [update: ActionsUpdate];
}

export interface ActionsInvokeChannelMap {
  /** Read the latest runs for the repository's current branch. */
  'actions:runs': { req: [input: ActionsRunsInput]; res: ActionsUpdate };
  /** Read one run's jobs and their steps. */
  'actions:jobs': { req: [input: ActionsJobsInput]; res: ActionsJobsResult };
  /** Start noticing pushes for this repository. Spawns nothing by itself. */
  'actions:observe': { req: [repoPath: string]; res: void };
  /** Stop noticing, and end any watch this repository has running. */
  'actions:release': { req: [repoPath: string]; res: void };
}

/** OPTIONAL surface, feature detected by the renderer. */
export interface GmuxActionsExtras {
  actions?: {
    runs(input: ActionsRunsInput): Promise<ActionsUpdate>;
    jobs(input: ActionsJobsInput): Promise<ActionsJobsResult>;
    observe(repoPath: string): Promise<void>;
    release(repoPath: string): Promise<void>;
    onChanged(cb: (update: ActionsUpdate) => void): Unsubscribe;
  };
}
