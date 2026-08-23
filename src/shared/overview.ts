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
