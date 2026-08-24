/**
 * The Catch Me Up wire types (Phase 137).
 *
 * One page shows the conversation you have been having with each session in
 * the open project, being your ask and the agent's closing answer for each
 * turn. Main builds these payloads from the overview store's rows and never
 * from raw reader output, so nothing the page draws has skipped redaction.
 * The payload names no file under the person's home, because the resolver
 * lives in main. Nothing here carries a session status, and nothing on this
 * surface may set one.
 */

export type OverviewLevel = 'session' | 'several' | 'project';

export type OverviewGitMark = 'agrees' | 'no-record' | 'nothing-to-check';

/** What the line for one session is made of. */
export type OverviewLineKind =
  | 'turns'              // at least one turn is on record
  | 'no-turns'           // an agent session with nothing asked yet, or a file not written yet
  | 'shell'              // agent === 'shell'
  | 'no-store'           // the provider keeps no record on this Mac, which is droid
  | 'unreadable'         // a record exists and could not be read. lineDetail says why
  | 'wrong-conversation' // the record names a different folder, which antigravity can do
  | 'remote';            // the session runs on another machine

export interface OverviewTurnView {
  index: number;
  askText: string;            // redacted, clipped to 4,000 characters
  askClipped: boolean;
  askAt: string | null;       // ISO 8601. null when the provider keeps no per turn clock
  answerText: string | null;  // redacted, clipped. null when no closing answer is on record
  answerClipped: boolean;
  answerAt: string | null;
  closed: boolean;
  interrupted: boolean;
  notice: string | null;      // the CLI's own notice for the turn, e.g. a usage limit. Never the agent's words
  git: OverviewGitMark;
  namedOnlyOutside: boolean;  // every path the turn named sits outside the project
}

export interface OverviewSessionView {
  sessionId: string;
  name: string;
  agent: string;              // the registry id, or 'shell'
  agentLabel: string;         // the registry displayName
  model: string | null;
  branch: string | null;
  line: OverviewLineKind;
  lineDetail: string | null;  // one sentence, main's words, shown verbatim for unreadable and wrong-conversation
  askOnly: boolean;           // gemini
  noTurnClock: boolean;       // deepseek
  startedAt: number;          // the manifest createdAt, epoch ms
  lastTouchedAt: number | null;
  turns: OverviewTurnView[];  // ascending index, newest LAST
  /**
   * The one sentence a model wrote for this session (Phase 138), or null when
   * none was written or the newest one was refused. Filled ONLY on the
   * overview:project payload, because the one session view and the multiplexed
   * view are re-read from the store and stay verbatim.
   */
  summary: string | null;
  /**
   * When that sentence was written, epoch ms, or null when no sentence is
   * drawn (Phase 138.1).
   *
   * The project view draws "written HH:MM" beside a sentence a model wrote,
   * and draws nothing at all beside the line Tortie builds, because a built
   * line is the default and silence is right for a default. Before this the
   * only way to find out whether a fold had ever run was to read the store.
   *
   * ONE FUNCTION FILLS BOTH FIELDS, so they cannot disagree. `summary` null
   * implies this is null.
   */
  summaryWrittenAt: number | null;
}

export type OverviewReadWork = 'full' | 'tail' | 'suffix' | 'none' | 'skipped';

export interface OverviewProject {
  projectPath: string;
  projectName: string;
  readAt: number;             // epoch ms
  isGitRepo: boolean;
  sessions: OverviewSessionView[];
  /** Diagnostics for the gate and the probe. Never drawn. */
  reads: Record<string, OverviewReadWork>;
}

export interface OverviewProjectInput {
  projectPath: string;
}

export interface OverviewSessionsInput {
  projectPath: string;
  sessionIds: string[];
  /** Turns per session, newest last. Default 50. Main caps it at 200. */
  turnLimit?: number;
}

// ---------------------------------------------------------------------------
// The story a session told, version by version (Phase 143)
// ---------------------------------------------------------------------------

/**
 * One drawn row of the story.
 *
 * The sentence is `text`, and it is a sentence a MODEL wrote about the
 * session rather than anything the session itself said. The real record is
 * the conversation, and the page says so in its own words above the list.
 *
 * Only versions the fold kept reach this shape. A refused fold and a failed
 * fold carry no sentence at all, so there is nothing on them for a person to
 * read. They stay on record in the store exactly as Phase 138 wrote them, and
 * their only mark here is the coverage flag on the next row.
 */
export interface OverviewTimelineEntry {
  /** The sentence a model wrote. Never empty, because an empty one is dropped. */
  text: string;
  /**
   * When the writing finished, epoch ms. It is NOT the time of any turn the
   * row covers, and the page says which clock this is.
   */
  writtenAt: number;
  /** The first turn index this row covers. */
  fromTurn: number;
  /** The last turn index this row covers. */
  toTurn: number;
  /** The harness that wrote it, being the registry id. */
  harness: string;
  /** The model that wrote it. */
  model: string;
  /**
   * True when more than one version in a row said exactly this, so they were
   * drawn as one. The row carries the LATER writing time, because a fold that
   * changed nothing is not news. Versions are drawn as one only when nothing
   * is lost by it, so the same harness and model wrote every one of them and
   * no turns between them are missing from the story.
   */
  repeated: boolean;
  /**
   * True when turns before this row are in no kept version, so the story
   * jumps over them. It happens in ordinary use: a fold that was refused
   * still moves the next fold's floor, so the turns it covered end up in
   * nothing a person can read. It is measured against the furthest turn any
   * earlier version reached, which only ever moves forward, so a row can
   * never claim a break that an earlier row already covered.
   */
  gapBefore: boolean;
}

/**
 * The whole story of one session, newest first.
 *
 * `chosen` is the person's own setting. When no harness and model are chosen
 * nothing is writing these, so main answers with `chosen` false and an empty
 * list and the page says that in one line rather than drawing an empty list.
 *
 * `modelChanged` is decided ONCE, here in main, so the page cannot reach a
 * different answer. It is true when the drawn rows were not all written by
 * the same harness and model, and only then does every row name its own.
 */
export interface OverviewTimeline {
  sessionId: string;
  entries: OverviewTimelineEntry[];
  chosen: boolean;
  modelChanged: boolean;
}

/** The turns one drawn row covers. The range comes from that row. */
export interface OverviewTimelineTurnsInput {
  sessionId: string;
  fromTurn: number;
  toTurn: number;
}
