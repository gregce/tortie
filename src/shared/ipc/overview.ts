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
 * Phase 293 added the seventh channel on this map, `overview:activity`. It
 * answers COUNTS for the sessions it is handed by id, being how many messages
 * the current conversation holds and when the last one was, for the session
 * manager's two activity columns. It takes ids rather than a project because
 * that sheet lists every project and machine at once, closed tabs included.
 * It reads what the other reads read and writes what they write, and no text
 * of any conversation crosses it.
 *
 * MAIN: src/main/overview/ipc.ts, the one `overview:*` registrar.
 */

import type { ArchOptions, FoldOptions } from '../fold';
import type {
  OverviewActivity,
  OverviewActivityInput,
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
   * The harnesses and models Settings offers for the arch enrichment
   * (Phase 158). The same three way join as `fold:options`, run against the
   * compiled ARCH recipe table instead of the fold's. It starts nothing and
   * it spawns nothing: choosing an agent in Settings never runs the pass,
   * which starts only from a person's gesture in the Architecture view.
   */
  'arch:options': { req: []; res: ArchOptions };
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
  /**
   * What each named session's current conversation holds, as counts
   * (Phase 293). One row per asked id, in the asked order, for any project and
   * a removed session included. Like its siblings it reads agent logs read
   * only, writes only Tortie's own overview store, spawns nothing, writes no
   * manifest row, touches no tmux and changes no session's state. A session
   * whose record Tortie cannot read from this Mac is answered with nulls and
   * a reason, never with zeros. More than OVERVIEW_ACTIVITY_MAX_IDS ids, or
   * an input that holds no array, is refused as INVALID_INPUT.
   */
  'overview:activity': {
    req: [input: OverviewActivityInput];
    res: OverviewActivity;
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
    archOptions(): Promise<ArchOptions>;
    timeline(sessionId: string): Promise<OverviewTimeline>;
    timelineTurns(
      input: OverviewTimelineTurnsInput
    ): Promise<OverviewTurnView[]>;
    /**
     * The counts for the named sessions (Phase 293). The session manager asks
     * it, and a build whose preload has no such method draws a dash in both
     * activity columns rather than breaking.
     */
    activity(input: OverviewActivityInput): Promise<OverviewActivity>;
  };
}

/** View > Catch Me Up. Rides EVT_MENU_ACTION like 'show-context'. */
export type OverviewMenuActionId = 'show-overview';
