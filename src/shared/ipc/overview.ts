/**
 * The overview contract (Phase 137): the two Catch Me Up reads.
 *
 * overview:project answers with one project, every session in it, and the
 * latest turn of each. overview:sessions answers with the named sessions and
 * up to `turnLimit` turns each. Both return `OverviewProject`, so the views
 * take one shape.
 *
 * Both channels READ. Each one opens the project's agent logs read only
 * through the per provider keep map, writes the redacted slice into Tortie's
 * own overview store beside the manifest, and builds the payload from store
 * rows only, so nothing the page draws has skipped redaction. Neither
 * channel spawns an agent, writes the manifest, touches tmux or sets a
 * session's status. The git corroboration inside the read runs `git log` and
 * `git status` against the project, which is a read of the repository and
 * not a change to it.
 *
 * Phase 143 added two more reads behind the same registrar. One answers the
 * story a session told, version by version, and the other answers the turns
 * one drawn row of that story covers. Both are SELECTs against tables Tortie
 * already wrote. Neither spawns a model, and neither runs a git command.
 *
 * MAIN: src/main/overview/ipc.ts, the one `overview:*` registrar.
 */

import type { FoldOptions } from '../fold';
import type {
  OverviewProject,
  OverviewProjectInput,
  OverviewSessionsInput,
  OverviewTimeline,
  OverviewTimelineTurnsInput,
  OverviewTurnView
} from '../overview';

export interface OverviewInvokeChannelMap {
  /** One project, every session, the latest turn of each. Reads logs, writes the store. */
  'overview:project': { req: [input: OverviewProjectInput]; res: OverviewProject };
  /** The named sessions with their last turns. Same read path, filtered. */
  'overview:sessions': { req: [input: OverviewSessionsInput]; res: OverviewProject };
  /**
   * The harnesses and models Settings offers for the fold (Phase 138). Main
   * joins the merged agent table, the Phase 23 confirm gate and the compiled
   * recipe table. It starts nothing and it spawns nothing.
   */
  'fold:options': { req: []; res: FoldOptions };
  /**
   * The story one session told, version by version (Phase 143). Main reads
   * the `summary` table the fold already wrote, keeps the versions it kept,
   * collapses the ones that say the same thing, and answers newest first. It
   * spawns nothing and it writes nothing.
   */
  'overview:timeline': { req: [sessionId: string]; res: OverviewTimeline };
  /**
   * The turns one drawn row of that story covers (Phase 143). Main reads the
   * turns it already stored, uses the git mark it already stored, and runs no
   * git command of its own.
   */
  'overview:timelineTurns': {
    req: [input: OverviewTimelineTurnsInput];
    res: OverviewTurnView[];
  };
}

/**
 * Extra on window.gmux: the Catch Me Up page's two reads, behind one object,
 * feature detected together. A build without the reader has no `overview`
 * object at all, and the page says one sentence instead of breaking.
 */
export interface GmuxOverviewExtras {
  overview: {
    project(input: OverviewProjectInput): Promise<OverviewProject>;
    sessions(input: OverviewSessionsInput): Promise<OverviewProject>;
    foldOptions(): Promise<FoldOptions>;
    timeline(sessionId: string): Promise<OverviewTimeline>;
    timelineTurns(
      input: OverviewTimelineTurnsInput
    ): Promise<OverviewTurnView[]>;
  };
}

/** View > Catch Me Up. Rides EVT_MENU_ACTION like 'show-context'. */
export type OverviewMenuActionId = 'show-overview';
