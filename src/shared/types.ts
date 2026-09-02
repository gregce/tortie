/**
 * gmux shared domain types — FROZEN CONTRACT.
 *
 * Every process (main, preload, renderer) and every parallel work stream codes
 * against these shapes. Existing declarations must not be changed; new types
 * may be APPENDED. If you believe an existing shape is wrong, note it for the
 * integrator instead of editing it.
 *
 * TWO DECLARATIONS WERE EDITED IN PLACE IN PHASE 19 ITEM 6, on the operator's
 * instruction, and this is the record of it.
 *
 *  1. `SessionStatus` gained `unknown` and `discarded`. Three separate entries
 *     in the durability queue each need a member added to it, and changing the
 *     meaning of a persisted alphabet three times is how a row written by one
 *     version gets misread by the next. The whole member set is designed at
 *     once, and later phases add producers rather than members.
 *  2. `SessionStatus` and `ResumeCapture` are now derived from a `const` list
 *     instead of being written as bare literals. The manifest kept its own
 *     copy of each list as a parse whitelist, and the type it used accepted a
 *     shorter copy, so adding a member without updating the copy compiled
 *     cleanly and silently degraded every row carrying it. Both unions are
 *     byte-identical to what they were.
 *
 * PHASE 70 added the one import this file has. `./machines` imports nothing at
 * all, so naming `MachineColor` here creates no cycle and pulls no code into
 * any bundle that did not already carry it.
 */

import type { MachineColor } from './machines';

/** Which agent (if any) a session runs. Plain shells are first-class. */
export type AgentKind = 'claude' | 'codex' | 'shell';

/**
 * Session lifecycle status. THIS ONE FIELD ANSWERS ONE QUESTION: what is this
 * session doing right now, as far as Tortie can prove. How the session got
 * here is a different fact and lives in {@link SessionRestore}.
 *
 * - running:     the pane's process is alive and producing output / working
 * - idle:        alive but quiet (prompt sitting, agent finished a turn)
 * - needs_input: agent is blocked waiting on the user (bell / hook / heuristic)
 * - exited:      process ended; tmux session may be gone
 * - restorable:  known only from the manifest (e.g. after reboot) — can be
 *                recreated with an ARMED resume command
 * - unknown:     Tortie cannot see the session and cannot prove it is gone.
 *                Losing the control connection is not the same event as
 *                losing the process, and an attention verdict that has run
 *                out of evidence is not the same thing as an idle session.
 *                Nothing may act on this status: it is never a restore
 *                candidate and it never starts a second agent.
 * - discarded:   the user removed this session and the row is a tombstone
 *                kept so the removal can be undone. Terminal. Reconcile never
 *                claims it, never revives it and never marks it restorable.
 *
 * WHY THE LAST TWO MEMBERS EXIST WITH NOTHING WRITING THEM YET (Phase 19
 * item 6). Three separate entries in the durability queue each need this
 * union changed: the honest restore (this phase), transport loss and
 * attention-lease expiry (research 33 entry 9, which needs `unknown`), and
 * the reversible remove (research 33 entry 21, which needs the tombstone).
 * Changing the meaning of a persisted alphabet three times is how rows
 * written by one version get misread by the next, so the member set is
 * designed once, here, and each later phase adds a producer rather than a
 * member. Reconcile already refuses to touch `discarded`, so a row written
 * by a later build cannot be resurrected by this one.
 *
 * WHAT IS DELIBERATELY NOT A MEMBER. A degraded restore, e.g. the folder came
 * back but the scrollback did not. That is provenance, not liveness, and a
 * session can be both "working" and "came back without its history" at the
 * same time. Flattening the two into one alphabet multiplies the members and
 * is what makes people reach for a state machine library (research 34 §3.5).
 * It is carried by `Session.restore` instead.
 *
 * The list is the single source and the type is derived from it, so a member
 * added above without adding it here is a compile error rather than a row
 * that silently degrades on read (research 34 §3.5, last defect).
 */
export const SESSION_STATUSES = [
  'running',
  'idle',
  'needs_input',
  'exited',
  'restorable',
  'unknown',
  'discarded'
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

/**
 * The stage of a restore that stopped it. The order is the order they run in.
 *
 * - preflight: checked before anything is created, e.g. the recorded folder
 *              is gone and substituting another one would arm a resume that
 *              opens an empty conversation.
 * - create:    `tmux new-session` itself failed. Nothing came back.
 * - replay:    the scrollback snapshot could not be typed into the pane.
 * - arm:       the resume command could not be typed into the pane.
 */
export type RestoreStage = 'preflight' | 'create' | 'replay' | 'arm';

/**
 * What a restore of this session actually achieved, in order of how much of
 * the session came back.
 *
 * - failed:      nothing was created. The row is still `restorable` and the
 *                user can try again.
 * - interrupted: Tortie stopped part way through the restore, so what came
 *                back is not known. Written by the restore journal at the
 *                next launch, never by the restore itself.
 * - shell_only:  the folder and a shell came back. Neither the scrollback nor
 *                a resume command did.
 * - transcript:  the scrollback came back. No resume command is waiting.
 * - armed:       the resume command is typed into the pane, waiting for the
 *                user to press Enter.
 *
 * THE KIND NAMES THE BEST THING THAT CAME BACK, and the two failure strings
 * say what did not. The scrollback replay and the resume arming are
 * independent stages: a session with no saved snapshot can arm its resume
 * perfectly, and that one is `armed`, not `shell_only`.
 *
 * Three of the kinds are each two different situations, and only the failure
 * strings tell them apart. A plain shell has no conversation to resume, so
 * `transcript` with no `armFailure` is a complete restore. A session with no
 * saved snapshot has no scrollback to replay, so `armed` with no
 * `replayFailure` is a complete restore too. Use `restoreShortfall()` in
 * shared/restore-status.ts rather than deciding this again at each call site.
 */
export type RestoreResultKind =
  | 'failed'
  | 'interrupted'
  | 'shell_only'
  | 'transcript'
  | 'armed';

/**
 * The record of the last restore of a session (Phase 19 item 6).
 *
 * WHY IT IS PERSISTED. The restore path already computed whether the
 * transcript was replayed and whether the resume was armed, and then threw
 * both away and wrote `running`. A restore where both stages failed read as a
 * healthy working session. Storing the stage results is what makes the status
 * derived from evidence rather than assigned.
 */
export interface SessionRestore {
  kind: RestoreResultKind;
  /** Epoch ms this result was decided. */
  at: number;
  /** Set on `failed`: the stage that stopped it. */
  stage?: RestoreStage;
  /** Set on `failed` and `interrupted`: one plain sentence about why. */
  reason?: string;
  /** Set when a snapshot existed and typing it into the pane threw. */
  replayFailure?: string;
  /** Set when a resume command existed and typing it into the pane threw. */
  armFailure?: string;
}

/**
 * A named terminal session. The user-visible `name` is the primary UX key;
 * `tmuxName` is its sanitized tmux-side form (gmux rewrites `.`/`:` → `-` at
 * create/rename — tmux 3.7+ no longer sanitizes for us; see FINAL-REPORT §2.4
 * Step 0). Live tmux commands should target immutable `$-ids`, not names.
 */
export interface Session {
  /** gmux-generated UUID, stable for the session's whole life (manifest PK). */
  id: string;
  /** User-visible display name (⌘T / F2). */
  name: string;
  /** Sanitized tmux session name derived from `name`. */
  tmuxName: string;
  /** Absolute path of the project (repo root) this session belongs to. */
  projectPath: string;
  /** Working directory the session was started in. */
  cwd: string;
  agent: AgentKind;
  /**
   * The agent's own conversation/session id when known — e.g. the UUID
   * pre-assigned via `claude --session-id <uuid>`, or a harvested Codex
   * rollout id. Absent for plain shells.
   */
  agentSessionId?: string;
  /**
   * Full argv that resumes the specific conversation after a reboot, e.g.
   * ["claude", "--resume", "<uuid>", ...original flags]. Recorded because
   * `--resume` does not re-apply launch flags. ARMED (pre-typed), never
   * auto-fired, per product decision.
   */
  resumeArgv?: string[];
  /**
   * APPENDED (Phase 13.5): how the conversation id for this session was — or
   * was not — obtained, so the UI can distinguish "comes back with its
   * conversation" from "comes back as a folder" while the session is still
   * running. See ResumeCapture at the foot of this file. Undefined on rows
   * written before the field existed; treat that as "derive it from
   * resumeArgv".
   */
  resumeCapture?: ResumeCapture;
  status: SessionStatus;
  /** Epoch milliseconds. */
  createdAt: number;
  /**
   * APPENDED (Phase 8 hardening, §6.6 exit-code truth): the exit status of
   * the session's process when known. Populated by main from tmux's dead-pane
   * status (`remain-on-exit failed` keeps failed panes long enough to read
   * `#{pane_dead_status}`). Undefined for clean exits recorded before this
   * field existed, for user-killed sessions, and for live sessions. A defined
   * non-zero value drives the "failed" visual (hollow red dot, error copy).
   */
  exitCode?: number;
  /**
   * APPENDED (Phase 12.7, research 21 §7): the SIGNAL that killed the
   * session's process, as tmux reports it in `#{pane_dead_signal}` (lower
   * case, no SIG prefix — e.g. "term"). A process that dies BY a signal has
   * an empty `pane_dead_status`, so without this field a targeted `kill`
   * looked exactly like a clean exit. Undefined for real exits (including
   * the 128+n codes agents that self-map signals report themselves) and for
   * rows written before this field existed.
   */
  exitSignal?: string;
  /**
   * APPENDED (Phase 48, research 47 sections 6 and 7): the last thing the pane
   * printed before it died.
   *
   * Three of the seven reproduced launch failures are an agent that starts and
   * then exits, so no check before the launch can predict them. For those the
   * pane prints its own reason and Tortie destroys the pane about one second
   * later, which used to replace the reason with "Session ended unexpectedly
   * (exit 1)". The text is taken from the snapshot the reaper already reads,
   * so nothing extra is captured.
   *
   * IT IS THE LAST FIVE NON EMPTY LINES, ANSI STRIPPED, CAPPED AT 500 BYTES.
   * It is rendered verbatim in a monospace block and it is NEVER parsed. No
   * branch in Tortie reads its content to decide anything, and what the
   * renderer draws is decided by `exitCode`, `exitSignal` and the session's
   * own timing.
   *
   * ABSENT MEANS NO LAST WORDS WERE RECORDED. That is the true answer for
   * every row written before this field existed and for every death with an
   * empty pane. It is cleared when a restore brings the session back, because
   * the words belong to a process that is no longer the one running.
   */
  exitDetail?: string;
  /**
   * APPENDED (Phase 15): SpecStory capture for this session, when it is on.
   * Absent = an ordinary uncaptured session. See SessionCapture.
   */
  capture?: SessionCapture;
  /**
   * APPENDED (Phase 19 item 6): what the LAST restore of this session
   * achieved. Absent means this session has never been restored, which is
   * the normal state of a session that has simply been running since it was
   * created. It is not cleared when the session is later working normally,
   * because "this came back without its history" stays true for the rest of
   * that session's life and is the answer to "where did my scrollback go".
   */
  restore?: SessionRestore;
  /**
   * APPENDED (Phase 26.3): true when a saved scrollback exists on disk for
   * this session. Main projects it for 'exited' rows only, from the snapshot
   * store's completion record (presence, not proof — verification stays
   * inside the restore itself). The renderer offers Restore on an ended
   * session only when this is true or a resume argv exists, so the verb never
   * promises material that is not there. Absent on live rows and on
   * projections written before this field existed.
   */
  hasSavedScrollback?: boolean;
  /**
   * APPENDED (Phase 29): epoch ms of the user's Remove, present only on
   * status 'discarded' rows. Orders the Past Sessions panel and renders as
   * "removed Aug 12". Absent on every live row.
   */
  removedAt?: number;
  /**
   * APPENDED (Phase 70): the machine this session runs on, when it is not
   * this Mac. Absent means it runs here. See {@link SessionMachine}.
   */
  machine?: SessionMachine;
  /**
   * APPENDED (Phase 72): what Tortie last knew about a session whose machine a
   * person removed.
   *
   * Present only on 'discarded' rows that carried a machine, and Past Sessions
   * is the one surface that draws it. It carries the LABEL rather than the
   * machine id, because the machine is no longer in the machines file and
   * nothing can look the name up afterwards.
   *
   * `lastSeenAt` is 0 when no completed list from that machine ever held the
   * row, and that case gets its own sentence rather than a date of zero.
   */
  machineGone?: {
    label: string;
    lastStatus: SessionStatus;
    lastSeenAt: number;
    forgottenAt: number;
  };
  /**
   * APPENDED (Phase 72): epoch ms of the newest saved output Tortie holds for
   * this session on THIS Mac, or absent when there is none.
   *
   * It is local receipt time and never a remote clock. It exists so a surface
   * can offer the saved output and state when it was taken, which is the fact
   * that stops a person reading an hours old screen as live.
   */
  savedOutputAt?: number;
  /**
   * APPENDED (Phase 93): what Tortie knew about this session's project tab at
   * the moment a person closed it.
   *
   * Present only on a row whose tab was closed while the session existed, and
   * cleared the moment the same folder is opened as a tab again. It says nothing
   * about status: the session is still running and still reachable.
   *
   * It exists so a surface can tell a folder whose tab a person closed from a
   * folder that never had one. Opening a tab a person closed needs no
   * explanation, because the tab is back and the session is in front of them.
   * Opening a tab for a folder that never had one gets one sentence saying why.
   *
   * `path` is the path on whichever computer this session's own `machine` field
   * names, so no local file check may run against it for a remote session.
   */
  closedProject?: {
    /** The tab's name at the moment it closed. */
    name: string;
    /** The folder, on whichever computer the session's own machine names. */
    path: string;
    /** Local epoch ms of the close. */
    closedAt: number;
  };
  /**
   * APPENDED (Phase 152): the absolute path of the AGENT'S OWN record for this
   * conversation, when Tortie can find it on this Mac right now.
   *
   * Derived, never stored. It comes from `resolveSessionLog`, the one resolver
   * that turns a manifest row into a path, and it is stamped on the projection
   * rather than written to the manifest because the file appears, moves and is
   * deleted by the agent rather than by Tortie. A row that carries it has been
   * proved to name a real file: the resolver returns a path only after a stat
   * says it is one, so a surface may draw this without checking again.
   *
   * Absent whenever there is no such path, and `recordAbsence` then says why.
   */
  recordPath?: string;
  /**
   * APPENDED (Phase 152): why this session has no `recordPath`.
   *
   * Present exactly when `recordPath` is absent, so a surface can say the
   * honest sentence instead of drawing an empty value. The two fields are
   * written together in one place, being `stampRecordLocation` in
   * src/main/sessions/record-path.ts.
   */
  recordAbsence?: SessionRecordAbsence;
}

/**
 * Why Tortie cannot name the file an agent keeps this conversation in.
 *
 * Phases 141 and 138.1 measured that this is normal rather than exceptional:
 * some agents hand Tortie no conversation id at all, one keeps no record a
 * reader can open, and a fresh conversation has written nothing yet. Each of
 * those is a different sentence to a person, so they are different values here
 * and the renderer never has to guess which one it is looking at.
 *
 *  - `shell`       a plain shell. It has no conversation and no record.
 *  - `remote`      the session runs on another machine, so its record is over
 *                  there. Tortie never looks for it on this Mac, because a
 *                  path that happened to match here would name a stranger's file.
 *  - `no-id`       no conversation id was captured, so there is nothing to
 *                  look for.
 *  - `not-yet`     the id is known and nothing is on disk under it yet. This is
 *                  the ordinary state of a conversation before its first turn.
 *  - `no-store`    the agent keeps no record Tortie can read.
 *  - `unsupported` Tortie has no map for where this agent keeps its records.
 */
export type SessionRecordAbsence =
  | 'shell'
  | 'remote'
  | 'no-id'
  | 'not-yet'
  | 'no-store'
  | 'unsupported';

/**
 * The machine this session runs on, when it is not this Mac (Phase 70).
 *
 * Absent means the session runs here, which is every session Tortie has ever
 * held before this release. It carries the label and the colour rather than
 * only the id, because the badge has to draw them and the main renderer holds
 * no machine list of its own.
 */
export interface SessionMachine {
  /** The machine row's id. */
  id: string;
  /** The row's label, or its address when it has none. */
  label: string;
  color: MachineColor;
  /** False when the last completed check of that machine did not answer. */
  answering: boolean;
  /**
   * APPENDED (Phase 72). True only when every condition for bringing this
   * session back holds.
   *
   * It is per ROW rather than per machine, even though it rides on the machine
   * object, because two of the conditions are about the row: whether that
   * machine's own last completed list still holds the session, and whether the
   * row was created on this machine at all. The renderer draws the verb from
   * this and from nothing else.
   */
  canRestore: boolean;
  /**
   * APPENDED (Phase 72). One sentence naming the condition that failed.
   *
   * NULL IN TWO CASES AND ONLY TWO. It is null when {@link canRestore} is true,
   * because there is nothing to explain. And it is null when the producer is
   * describing a MACHINE rather than one session, which is the badge the
   * renderer draws for a quiet machine with no row in hand: `canRestore` is
   * false there because nothing was checked, and inventing a reason would be a
   * claim about a session that was never named.
   *
   * A surface reading a false {@link canRestore} hides the verb either way. The
   * sentence is what it prints beside the row when it has one.
   */
  restoreReason: string | null;
  /**
   * APPENDED (Phase 73). Epoch ms of the last connected-time copy of this
   * session's own conversation file, null when there has never been one, and
   * absent when the producer was not asked.
   *
   * IT IS A STALENESS STATEMENT AND NEVER A CURRENCY STATEMENT. A machine that
   * has been out of reach for a day carries the same number it carried a day
   * ago, and the sentence a person reads gets older rather than being
   * refreshed. Tortie never says a conversation is current. It says when it
   * last copied it, and the person judges.
   *
   * A refusal is not a copy. A conversation file too large to bring home
   * answers null here, and the panel says what happened from the record beside
   * the bytes rather than from this number.
   */
  conversationSyncedAt?: number | null;
}

/**
 * What a captured session's row tells the renderer (Phase 15).
 *
 * It exists as a projection rather than a boolean because two of its fields
 * change what the UI may CLAIM:
 *
 *  - `exitCodeApproximate` — under `specstory run`, four of the eight
 *    providers collapse every non-zero agent exit to 1 (measured: a child
 *    exiting 42 comes back 1 through codex/deepseek/droid/antigravity). The
 *    death report must not present that number as the agent's own.
 *  - `cloud` — whether this capture could reach SpecStory Cloud at all. "Saved
 *    locally" and "saved and uploaded" are different promises and the user
 *    signed in (or did not) expecting one of them.
 */
/**
 * A capture failure the user needs to hear about once (Phase 15).
 *
 * Only failures travel. `kind` distinguishes the two the user can act on:
 * `sync-failed` is "the tail of this conversation may not be saved", and
 * `declined` is "you asked for capture at create and it did not happen" —
 * said at create time rather than discovered later in an empty history folder.
 */
export interface SessionCaptureNotice {
  kind: 'sync-failed' | 'declined';
  /** The session it is about, so the toast can name it. */
  sessionId: string;
  sessionName: string;
  /** One plain sentence, already written for a toast. */
  message: string;
}

export interface SessionCapture {
  /** The `specstory run <provider>` positional this session launched under. */
  provider: string;
  /** Absolute path of the SpecStory binary the session was launched with. */
  bin: string;
  /** Version of that binary at create time, when it identified itself. */
  binVersion?: string;
  /** True when this session's recorded exitCode may be a collapsed 1. */
  exitCodeApproximate: boolean;
}

/** A project tab: one repo checkout. */
export interface Project {
  /** gmux-generated UUID. */
  id: string;
  /** Absolute path to the project directory (usually a git repo root). */
  path: string;
  /** Display name (defaults to basename of path). */
  name: string;
  /**
   * APPENDED (Phase 90.1): the machine this project's files are on.
   *
   * Omitted, or the string `local`, means this Mac, which is every project in
   * every build so far. Main does not set it yet. It exists so the four
   * sidebar stores can be keyed on identity rather than on a path string,
   * which is wrong the moment two machines hold the same path. See
   * `WorkspaceTarget` in ./workspace-target.ts for the pair itself.
   */
  machineId?: string;
}

// ---------------------------------------------------------------------------
// IPC request/response payloads
// ---------------------------------------------------------------------------

export interface CreateSessionInput {
  /** Display name; gmux derives the sanitized tmux name. */
  name: string;
  projectPath: string;
  /** Defaults to projectPath when omitted. */
  cwd?: string;
  agent: AgentKind;
  /** Extra argv appended to the agent command (e.g. --model, --add-dir). */
  extraArgs?: string[];
  /**
   * APPENDED (Phase 15): run this session under SpecStory capture. Omitted or
   * false = the bare agent, exactly as before. Requesting capture is a
   * REQUEST, not a guarantee — main declines (and says so) when there is no
   * SpecStory CLI, no provider for this agent, or an argv that cannot survive
   * the wrapper unchanged. See SessionCapture for what actually happened.
   */
  capture?: boolean;
  /**
   * APPENDED (Phase 48): skip the structural preflight in
   * src/main/agents/health.ts and launch the argv it refused.
   *
   * It is the `Start it anyway` button and nothing else sets it. The check
   * reads a shebang and asks whether the interpreter it names is on the PATH
   * the pane will get, and it can be wrong about a wrapper that re-execs
   * through something Tortie cannot see, so the person gets the last word. It
   * skips one read of one file. It changes no argv, no environment and no
   * permission.
   */
  startAnyway?: boolean;
  /**
   * APPENDED (Phase 70): create this session on another machine.
   *
   * Omitted, or the string 'local', means this Mac, which is every create
   * before this release. Any other value names a row in machines.json, and the
   * create refuses unless that row is confirmed and its version is one Tortie
   * has measured.
   */
  machineId?: string;
  /**
   * APPENDED (Phase 90.3): which machine {@link CreateSessionInput.projectPath}
   * is a path on.
   *
   * Omitted, or the string 'local', means this Mac, which is every create
   * before this release. It exists because main cannot otherwise tell the two
   * remote creates apart. A create started from a tab that is itself on the
   * machine sends a project path that already belongs to that machine. A
   * create started from a tab on this Mac sends this Mac's project path and
   * names the folder over there in `cwd`, and main must not record this Mac's
   * path as the folder of a session that runs somewhere else.
   */
  projectMachineId?: string;
}

export interface RenameSessionInput {
  sessionId: string;
  /** New display name. */
  name: string;
}

export interface ResizeInput {
  sessionId: string;
  cols: number;
  rows: number;
}

// ---------------------------------------------------------------------------
// Git
// ---------------------------------------------------------------------------

/**
 * Single-letter state as reported by `git status --porcelain=v2 -z`
 * (XY fields): M=modified, A=added, D=deleted, R=renamed, C=copied,
 * U=unmerged, '?'=untracked, '!'=ignored, '.'=unchanged on that side.
 */
export type GitFileState =
  | 'M'
  | 'A'
  | 'D'
  | 'R'
  | 'C'
  | 'U'
  | '?'
  | '!'
  | '.';

export interface GitFileStatus {
  /** Path relative to the repo root. */
  path: string;
  /** Original path when renamed/copied. */
  origPath?: string;
  /** Index (staged) side of the XY pair. */
  indexState: GitFileState;
  /** Worktree (unstaged) side of the XY pair. */
  worktreeState: GitFileState;
}

export interface GitStatusResult {
  repoPath: string;
  /** Undefined when detached HEAD; then `detachedAt` carries the short SHA. */
  branch?: string;
  detachedAt?: string;
  upstream?: string;
  ahead: number;
  behind: number;
  /** True while a merge/rebase/cherry-pick is in progress. */
  merging: boolean;
  files: GitFileStatus[];
  /** False when the directory is not a git repository (friendly UI state). */
  isRepo: boolean;
}

export interface GitPathsInput {
  repoPath: string;
  /** Paths relative to repoPath. */
  paths: string[];
}

export interface GitCommitInput {
  repoPath: string;
  message: string;
  amend?: boolean;
}

export interface GitLogInput {
  repoPath: string;
  /** Default 200. */
  maxCount?: number;
}

export interface GitLogEntry {
  hash: string;
  parents: string[];
  authorName: string;
  authorEmail: string;
  /** Epoch milliseconds. */
  authorDate: number;
  subject: string;
}

export interface GitShowHeadInput {
  repoPath: string;
  /** Path relative to repoPath. */
  path: string;
}

// ---------------------------------------------------------------------------
// APPENDED by the git-service stream (Phase 3) — new types only, nothing
// above was modified. The `git:status` / `git:log` invoke channels keep their
// frozen response types; the git service actually returns these SUPERSETS
// (structurally compatible), so renderers may narrow or feature-detect.
// ---------------------------------------------------------------------------

/**
 * VS Code-style resource groups derived from the same porcelain-v2 entries in
 * `GitStatusResult.files` (a file with both staged and worktree edits appears
 * in `staged` AND `changes`, exactly like VS Code's SCM view).
 */
export interface GitStatusGroups {
  /** Unmerged/conflicted entries (porcelain `u` lines). */
  merge: GitFileStatus[];
  /** Entries whose index side changed (M/A/D/R/C staged). */
  staged: GitFileStatus[];
  /** Tracked entries whose worktree side changed. */
  changes: GitFileStatus[];
  /** Untracked files (`?`). */
  untracked: GitFileStatus[];
}

/** What `git:status` actually resolves to: the frozen shape + groups. */
export interface GitStatusDetailed extends GitStatusResult {
  groups: GitStatusGroups;
  /**
   * True when the repo had more changed files than the status limit
   * (10 000, VS Code's `git.statusLimit` default) and `files` was capped.
   */
  truncated?: boolean;
}

/** What `git:log` entries actually resolve to: the frozen shape + extras. */
export interface GitLogEntryDetailed extends GitLogEntry {
  /** Alias of `hash` (full 40-char SHA). */
  sha: string;
  /** Abbreviated SHA (`%h`). */
  shortSha: string;
  /** Alias of `authorName`. */
  author: string;
  /** `authorDate` as an ISO-8601 string. */
  dateISO: string;
}

// ---------------------------------------------------------------------------
// fs
// ---------------------------------------------------------------------------

export interface ReadFileResult {
  path: string;
  contents: string;
  encoding: 'utf8';
  /** True when the file exceeded the read cap and was truncated. */
  truncated: boolean;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// APPENDED by the file-tree stream (fs:readDir / fs:reveal) — new types only,
// nothing above was modified.
// ---------------------------------------------------------------------------

/** One entry of a directory listing (`fs:readDir`). */
export interface FsDirEntry {
  /** Base name within the directory. */
  name: string;
  /** Absolute path (`join(dirPath, name)`). */
  path: string;
  /**
   * 'dir' ONLY for real directories (`Dirent.isDirectory()`); symlinks are
   * reported as 'symlink' even when they target directories, so the tree
   * never follows link cycles. 'other' covers sockets/FIFOs/devices.
   */
  kind: 'file' | 'dir' | 'symlink' | 'other';
}

export interface ReadDirResult {
  /** The directory that was listed (absolute). */
  path: string;
  /**
   * Unfiltered and unsorted — the renderer hides `.git` and sorts
   * (directories first, case-insensitive by name). Dotfiles are included.
   */
  entries: FsDirEntry[];
}

// ---------------------------------------------------------------------------
// APPENDED by the git-depth stream (dogfood round 1) — new types only, nothing
// above was modified. Powers branch switching, the per-commit context menu,
// and the rich commit hover card (git:branches / git:checkout /
// git:createBranch / git:createTag / git:cherryPick / git:commitDetail /
// git:remoteUrl / git:checkoutDetached).
// ---------------------------------------------------------------------------

/** One local branch, from `git for-each-ref refs/heads`. */
export interface GitBranchInfo {
  /** Short branch name (e.g. "main", "feature/x"). */
  name: string;
  /** True for the branch HEAD points at (`%(HEAD)` marker). */
  current: boolean;
  /** Full OID of the branch tip. */
  sha: string;
  /** Abbreviated tip OID. */
  shortSha: string;
  /** Upstream short name (e.g. "origin/main"); absent when none is set. */
  upstream?: string;
  /** True when the configured upstream branch no longer exists ("gone"). */
  upstreamGone?: boolean;
  /** Commits ahead of upstream (0 when no upstream). */
  ahead: number;
  /** Commits behind upstream (0 when no upstream). */
  behind: number;
  /** Subject line of the tip commit. */
  subject: string;
}

export interface GitCheckoutInput {
  repoPath: string;
  /** Local branch name to switch to. */
  branch: string;
}

export interface GitCreateBranchInput {
  repoPath: string;
  /** New branch name (validated by git itself). */
  name: string;
  /** Start point (SHA/branch/tag); defaults to HEAD. */
  fromRef?: string;
}

export interface GitCreateTagInput {
  repoPath: string;
  /** New (lightweight) tag name. */
  name: string;
  /** The commit to tag (SHA/branch). */
  ref: string;
}

export interface GitCherryPickInput {
  repoPath: string;
  /** Commit SHA to cherry-pick onto HEAD. */
  sha: string;
}

export interface GitCommitDetailInput {
  repoPath: string;
  /** Commit SHA (full or abbreviated). */
  sha: string;
}

export interface GitCheckoutDetachedInput {
  repoPath: string;
  /** Commit SHA to check out detached. */
  sha: string;
}

/**
 * Cherry-pick outcome — conflicts are a TYPED STATE, not an exception.
 * On conflict gmux always runs `git cherry-pick --abort` first (the repo is
 * never left mid-cherry-pick); `aborted` is false only when even the abort
 * failed (detail then carries git's own text so the user can recover).
 */
export type GitCherryPickResult =
  | { status: 'applied'; sha: string }
  | { status: 'conflict'; aborted: boolean; detail?: string };

/**
 * Per-file status letter within one commit (`--name-status`):
 * A=added, M=modified, D=deleted, R=renamed, C=copied, T=typechange,
 * U=unmerged, X=unknown.
 */
export type GitCommitFileState =
  | 'A'
  | 'M'
  | 'D'
  | 'R'
  | 'C'
  | 'T'
  | 'U'
  | 'X';

/** One changed file within a commit (hover card / Open Changes). */
export interface GitCommitFileChange {
  /** Path relative to the repo root (the NEW path for renames). */
  path: string;
  /** Original path when renamed/copied. */
  origPath?: string;
  status: GitCommitFileState;
  /** Lines added in this file (0 for binary files). */
  insertions: number;
  /** Lines removed in this file (0 for binary files). */
  deletions: number;
  /** True when git reported the file as binary (`-` numstat counts). */
  binary?: boolean;
}

/** Everything the rich commit hover card needs, in one response. */
export interface GitCommitDetail {
  /** Full 40-char SHA. */
  sha: string;
  shortSha: string;
  /** Author name. */
  author: string;
  /** Author email. */
  email: string;
  /** Author date, strict ISO-8601 (`%aI`). */
  dateISO: string;
  /** First line of the commit message. */
  subject: string;
  /** Rest of the message after the subject (may be empty). */
  body: string;
  files: GitCommitFileChange[];
  /** Total insertions across all files (binary files count 0). */
  insertions: number;
  /** Total deletions across all files (binary files count 0). */
  deletions: number;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-10 registry+detection stream — new types only, nothing
// above was modified. The 12-agent registry (docs/research/11-agent-registry.md)
// lives in src/main/agents/registry.ts; these are the wire shapes shared with
// the renderer (agents:list / agents:rescan) plus the widened agent-id unions.
//
// INTEGRATOR note: `AgentKind` ('claude'|'codex'|'shell') is frozen above, so
// Session.agent / CreateSessionInput.agent cannot yet carry the new registry
// agents end-to-end. When reconciling, widen AgentKind to LaunchableAgentKind
// (below) — src/main/manifest/agents.ts buildLaunchSpec already accepts it,
// and src/main/ipc.ts createSession must resolve the binary via
// agentBinaryName(agent) from src/main/agents/registry (cursor's binary is
// `cursor-agent`, antigravity's is `agy` — the bare id is NOT the binary).
// ---------------------------------------------------------------------------

/** Every agent in the gmux registry (research 11 plus later phases; all 14 entries). */
export type AgentRegistryId =
  | 'claude'
  | 'cursor'
  | 'codex'
  | 'gemini'
  | 'droid'
  | 'deepseek'
  | 'antigravity'
  | 'muse'
  | 'qwen'
  | 'pi'
  | 'omp'
  | 'grok'
  | 'cursoride'
  | 'copilotide';

/**
 * Registry agents gmux can launch in a tmux pane — everything except the
 * IDE capture-only pair (cursoride/copilotide). pi is launchable per
 * BACKLOG Phase-10 item 1 but carries `unverified` mechanics.
 */
export type LaunchableAgentId = Exclude<AgentRegistryId, 'cursoride' | 'copilotide'>;

/** AgentKind widened with the new launchable registry agents (Phase 10). */
export type LaunchableAgentKind = AgentKind | LaunchableAgentId;

/**
 * One row of the agents:list / agents:rescan detection result.
 *
 * PHASE 23 DECISION, and it is the one the re-baseline called the largest in
 * the phase. `id` is a `string` here and `AgentRegistryId` everywhere else.
 *
 * The reason for the split is that the two kinds of site want opposite things.
 *
 *  - This is a WIRE row. It carries whatever the merged agent table holds,
 *    which is the thirteen compiled agents plus any the user's `agents.json`
 *    adds. A closed union here would mean a configured agent could not be
 *    described to the renderer at all, so the picker could never offer it.
 *  - `ImageDropTable.agents`, `MultilineKeyTable.agents`, and the three
 *    settings maps keyed on `LaunchableAgentId` are COMPILED tables. Their
 *    keys name rows that exist in the build. Widening those would turn a typo
 *    into a silently empty lookup, and `Partial<Record<string, T>>` says
 *    nothing that `Record<string, T | undefined>` does not already say.
 *
 * So `AgentRegistryId` keeps its thirteen literals and keeps its meaning, which
 * is "an agent this build ships". It is a documented subset of the ids that
 * can appear on this field, not the whole set.
 *
 * A configured agent reaching a compiled table gets `undefined` and the
 * fallback, which is the behaviour those tables already had for `shell` and
 * for every agent with no row. Nothing new can go wrong there.
 */
export interface DetectedAgent {
  id: string;
  displayName: string;
  /** 'cli' = tmux-launchable terminal agent; 'ide' = app watcher. */
  kind: 'cli' | 'ide';
  /** False for the capture-only IDE pair — never offered for launch. */
  launchable: boolean;
  /**
   * CLI: an executable was resolved (and the identity probe, when one
   * exists, did not contradict it). IDE: the session store exists.
   */
  installed: boolean;
  /** Resolved absolute executable path; null when not found. */
  binPath: string | null;
  /** Version string from the registry versionCmd; null when unknown. */
  version: string | null;
  /** The agent's session-store root exists (installed AND in-use signal). */
  storeDetected: boolean;
  /** AgentIcon key (unknown keys render the terminal-glyph fallback). */
  iconKey: string;
  /** True when the registry marks this agent's mechanics UNVERIFIED (pi). */
  unverified: boolean;
  /**
   * PHASE 23. Whether this agent came from `agents.json` and can cause a
   * program to run, and if so what the confirm gate says about it right now.
   *
   * Undefined for every compiled agent and for a configuration row that only
   * renames one, because those rows have nothing to confirm and a state on
   * them would tell a user their working agent is blocked when it is not.
   *
   * The picker MUST read this. A row that is not 'confirmed' cannot start, so
   * offering it as an ordinary choice sends a person through a name field and
   * a Create button to a modal error. The field exists so the picker can say
   * so before the click rather than after it.
   */
  configState?: 'confirmed' | 'never' | 'changed' | 'unknown';
  /**
   * Phase 49. The provider's own install command, for display and the
   * clipboard and nothing else. Null when the provider publishes none (muse),
   * for the IDE pair, and for a configured agent. Nothing in it is ever run.
   */
  install?: {
    command: string;
    docUrl: string;
    /** ISO date the provider's page was read, e.g. '2026-08-15'. */
    readOn: string;
    /** True when the provider's own first choice is a package manager. */
    canonicalIsPackageManager: boolean;
  } | null;
  /** Phase 49. How the resolved copy reached the disk. 'unknown' when not installed. */
  installKind?: 'canonical' | 'package-manager' | 'unknown';
  /** Phase 49. What actually runs when the resolved file starts. Null when unknown. */
  runtime?:
    | { kind: 'binary' }
    | { kind: 'script'; interpreter: string; interpreterPath: string | null }
    | null;
  /** Phase 49. The file binPath really is, after symlinks. */
  realPath?: string | null;
  /**
   * Phase 49. Other copies of the same binary name found later in the walk,
   * deduped by real path, capped at 4. Empty for almost every agent.
   */
  shadowed?: { path: string; version: string | null }[];
  /** Phase 49. True when an agents.json patch pins this agent to an explicit path. */
  overridden?: boolean;
}

/** Full detection result (agents:list / agents:rescan). */
export interface AgentsScanResult {
  /** All 13 registry agents, in registry order (installed or not). */
  agents: DetectedAgent[];
  /** Epoch ms when this scan ran (cache timestamp for the Settings UI). */
  scannedAt: number;
}

// ---------------------------------------------------------------------------
// APPENDED by the branch-management stream (Phase 10 #7) — new types only,
// nothing above was modified. Powers the BRANCHES sidebar section: remote
// refs enumeration (git:remoteBranches), network fetch (git:fetch),
// tracking checkout of a remote branch (git:checkoutTracking), and local
// branch deletion with a typed unmerged state (git:deleteBranch).
// ---------------------------------------------------------------------------

/** One remote-tracking branch, from `git for-each-ref refs/remotes`. */
export interface GitRemoteBranchInfo {
  /** Full short refname including the remote (e.g. "origin/feat/x"). */
  name: string;
  /** The remote's name (e.g. "origin"). */
  remote: string;
  /** Branch name without the remote prefix (e.g. "feat/x"). */
  shortName: string;
  /** Full OID of the branch tip. */
  sha: string;
  /** Abbreviated tip OID. */
  shortSha: string;
  /** Subject line of the tip commit. */
  subject: string;
}

/** git:remoteBranches result — refs plus the repo's last-fetch timestamp. */
export interface GitRemoteBranchesResult {
  /** All remote-tracking branches; symbolic <remote>/HEAD entries deduped. */
  branches: GitRemoteBranchInfo[];
  /**
   * mtime of .git/FETCH_HEAD in epoch ms — when this clone last talked to a
   * remote (fetch or pull). Null before any fetch (fresh clone counts: clone
   * writes no FETCH_HEAD) or when unreadable.
   */
  lastFetchedAt: number | null;
}

export interface GitCheckoutTrackingInput {
  repoPath: string;
  /** Remote-tracking ref to check out, e.g. "origin/feat/x". */
  remoteBranch: string;
}

export interface GitDeleteBranchInput {
  repoPath: string;
  /** Local branch name to delete. */
  name: string;
  /** True runs `git branch -D` (discard unmerged commits). */
  force?: boolean;
}

/**
 * Delete outcome — "not fully merged" is a TYPED STATE, not an exception,
 * so the UI can offer the force option exactly when git would need it.
 */
export type GitDeleteBranchResult =
  | { status: 'deleted' }
  | { status: 'unmerged' };

/**
 * Structured error shape. Main-process handlers throw Error whose `message`
 * is `JSON.stringify(GmuxErrorPayload)` when they can classify the failure;
 * renderers may fall back to the raw message for unclassified errors.
 */
export interface GmuxErrorPayload {
  code:
    | 'TMUX_NOT_FOUND'
    | 'TMUX_UNREACHABLE'
    | 'SESSION_NOT_FOUND'
    | 'PROJECT_NOT_FOUND'
    | 'NOT_A_GIT_REPO'
    | 'GIT_FAILED'
    | 'FS_FAILED'
    | 'SPAWN_FAILED'
    | 'INVALID_INPUT'
    // APPENDED (Phase 9.2 Bug A): the agent CLI for a new session could not
    // be resolved to an executable — surfaced as a friendly create-modal
    // message, never a dead pane. `detail` carries the bare binary name.
    | 'AGENT_NOT_FOUND'
    // APPENDED (Phase 48): the agent's file was found, and the program its
    // first line asks for was not. An npm shim starts `#!/usr/bin/env node`,
    // and a pane whose PATH has no `node` opens and dies at once with exit
    // 127. It is a different sentence from AGENT_NOT_FOUND, because the agent
    // IS installed and telling the user to install it again is the wrong
    // instruction. Thrown before anything is spawned, by the check in
    // src/main/agents/health.ts. `detail` carries the absolute path of the
    // file that was resolved. The create sheet answers it with `Start it
    // anyway`, which re-sends the same argv with the check skipped.
    | 'AGENT_INTERPRETER_MISSING'
    // APPENDED (Phase 109): the agent is not on the MACHINE the session
    // would run on. `findRemoteProgram` walked that machine's own three
    // folder lists and found no executable file under the bare name, so the
    // create or the restore refused before anything started there. It is a
    // different code from AGENT_NOT_FOUND, because the create sheet's
    // answer is different: the machine is named, no install command is
    // drawn, and the one action asks THAT MACHINE again rather than
    // rescanning this Mac. `message` carries main's refusal naming the
    // machine's label.
    | 'AGENT_NOT_ON_MACHINE'
    // APPENDED (Phase 41), three codes about WHICH tmux is running.
    //
    // TMUX_BUNDLE_INCOMPLETE is a packaged Tortie whose own copy of tmux is
    // not inside the bundle. It is a broken install, not a missing
    // prerequisite, so it is a different code from TMUX_NOT_FOUND and the
    // user is never told to install anything.
    | 'TMUX_BUNDLE_INCOMPLETE'
    // A tmux server was already running and the pair of versions is one this
    // release never tested, or its version could not be read at all. The boot
    // stops before the first attach, because attaching across an untested
    // pair can hang rather than fail. Nothing is changed and nothing ends.
    | 'TMUX_VERSION_UNTESTED'
    // tmux itself refused the connection over a protocol difference. This one
    // comes from classifyTmuxFailure reading tmux's own words, so it can
    // arrive at any command, not only at boot.
    | 'TMUX_VERSION_MISMATCH'
    // APPENDED (Phase 116): shutdown has started, so the core refuses to
    // start new work instead of handing back the instance being torn down.
    // `getGmuxCore()` and every guarded mutator answer with this code from
    // the moment `shutdownGmuxCore()` runs until the process ends. `detail`
    // carries the entry point that refused, e.g. `createSession`. The
    // renderer needs no new handling: the refusal fires only while the
    // windows are closing, and every call site already catches invoke
    // rejections.
    | 'SHUTTING_DOWN'
    | 'UNKNOWN';
  message: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-12 git stream — new types only, nothing above was
// modified. Two capabilities:
//
//  (a) BACKLOG 12 item 4 — historical commit diffs. Opening a file from the
//      HISTORY section must render `<sha>^ → <sha>` (DESIGN-SPEC S3A), not
//      HEAD → worktree. git:commitFileDiff returns that pair for ONE file of
//      ONE commit, with a null side for adds/deletes (VS Code's semantics,
//      and @pierre/diffs' DiffFileInput accepts null directly).
//  (b) BACKLOG 12 item 3 — push / pull / sync + the remotes list.
// ---------------------------------------------------------------------------

/** What the renderer knows about a file row in a commit (the click gesture). */
export interface GitCommitFileDiffInput {
  repoPath: string;
  /** The commit to show (full or abbreviated SHA). */
  sha: string;
  /** Path AS OF this commit (the NEW path for renames), repo-root relative. */
  path: string;
  /** Pre-rename path for R/C entries — the left side's path. */
  origPath?: string;
  /**
   * name-status letter from the commit's file list. A HINT only: whether a
   * side exists is decided by whether git can read that blob, so a stale
   * letter degrades to a correct add/delete instead of a wrong diff.
   */
  status: GitCommitFileState;
}

/** The parent→commit content pair for one file (git:commitFileDiff). */
export interface GitCommitFileDiff {
  /** Full SHA of the commit being shown. */
  sha: string;
  shortSha: string;
  /** First parent's full SHA; null for a ROOT commit (left side is empty). */
  parentSha: string | null;
  /** Left path; null when the file did not exist in the parent (added). */
  oldPath: string | null;
  /** Right path; null when the file is gone at this commit (deleted). */
  newPath: string | null;
  /** Left contents; null when that side is absent OR the file is binary. */
  oldContents: string | null;
  /** Right contents; null when that side is absent OR the file is binary. */
  newContents: string | null;
  /** Either side contains NUL in its first 8000 bytes (git's own heuristic). */
  binary: boolean;
}

/** One configured remote (`git remote -v`), with its tracking marker. */
export interface GitRemoteInfo {
  /** Remote name, e.g. "origin". */
  name: string;
  /** URL git fetches from. */
  fetchUrl: string;
  /** URL git pushes to (equals fetchUrl unless a pushurl is configured). */
  pushUrl: string;
  /** True when the CURRENT branch's upstream lives on this remote. */
  tracked: boolean;
}

/** git:remotes result — the configured remotes plus the tracking context. */
export interface GitRemotesResult {
  /** Configured remotes, name-sorted; empty for a repo with no remotes. */
  remotes: GitRemoteInfo[];
  /** Current branch name; null when detached, unborn, or not a repo. */
  branch: string | null;
  /** Upstream ref of the current branch ("origin/main"); null when none. */
  upstream: string | null;
}

export interface GitPushInput {
  repoPath: string;
  /**
   * Publish: run `git push -u <remote> <branch>` and set the upstream. Only
   * meaningful when the branch has none — that case otherwise resolves with
   * `{status:'no-upstream'}` so the UI can offer "Publish Branch" instead of
   * guessing a remote behind the user's back.
   */
  setUpstream?: boolean;
  /** Remote to publish to; defaults to the repo's only/origin remote. */
  remote?: string;
}

/**
 * Push outcome. "This branch has no upstream" is a TYPED STATE, not an
 * exception — it is the normal state of a fresh branch, and the answer is a
 * Publish affordance, not an error toast.
 */
export type GitPushResult =
  | { status: 'pushed'; remote: string; branch: string }
  | { status: 'up-to-date'; remote: string; branch: string }
  | { status: 'no-upstream'; branch: string; remote: string | null };

export interface GitPullInput {
  repoPath: string;
}

/**
 * Pull outcome. Conflicts are a typed state (the repo is left mid-merge on
 * purpose, exactly as on the CLI — the Changes section shows the conflicts),
 * and "no upstream" mirrors GitPushResult.
 */
export type GitPullResult =
  | { status: 'pulled'; upstream: string }
  | { status: 'up-to-date'; upstream: string }
  | { status: 'no-upstream'; branch: string }
  | { status: 'conflict'; detail?: string };

export interface GitSyncInput {
  repoPath: string;
}

/** Sync = pull, then push (VS Code's Sync Changes). */
export interface GitSyncResult {
  pull: GitPullResult;
  /** null when the pull did not succeed — a broken pull is never pushed over. */
  push: GitPushResult | null;
}

// ---------------------------------------------------------------------------
// APPENDED by the image-drop stream (Phase 12 item 8, research 16) — new types
// only, nothing above was modified. Dropping (or ⌘V-ing) a file onto a session
// inserts a reference to it at the caret; how that reference is inserted is
// per-agent DATA that lives once, in the main-process agent registry.
// ---------------------------------------------------------------------------

/**
 * How a file reference reaches one agent's prompt (research 16 §2):
 *  - 'paste-path'       bracket-paste the absolute path; the agent turns it
 *                       into a real attachment (Claude's `[Image #N]`).
 *  - 'clipboard-attach' the agent only reads IMAGE DATA off the system
 *                       pasteboard (deepseek, antigravity). ⌘V works as-is;
 *                       a drop degrades to path text until the guarded
 *                       pasteboard write ships (research 16 §7, Stage 2).
 *  - 'path-text'        insert the path as ordinary text. No attachment, but
 *                       every CLI can read it. The default for anything
 *                       unverified, for shells, and for non-image files.
 */
export type ImageDropStrategy = 'paste-path' | 'clipboard-attach' | 'path-text';

/** One agent's file-reference behavior. */
export interface AgentImageDrop {
  strategy: ImageDropStrategy;
  /**
   * How path TEXT is inserted when we insert path text at all. 'type' exists
   * solely for antigravity, whose completion popup swallows the next
   * keystroke after a bracketed paste (research 16 §2).
   */
  insert: 'paste' | 'type';
  /** true = observed hands-on 2026-08-10 (research 16); false = inherited. */
  verified: boolean;
  notes?: string;
}

/** drop:strategies — the whole per-agent table (static per build). */
export interface ImageDropTable {
  /** Registry agents that carry an explicit strategy. */
  agents: Partial<Record<AgentRegistryId, AgentImageDrop>>;
  /** Used for shells and for any agent absent from `agents`. */
  fallback: AgentImageDrop;
}

/** One dropped path after main classified it (drop:prepare). */
export interface DropPreparedItem {
  /** The path the renderer resolved (webUtils, or the drop store). */
  sourcePath: string;
  kind: 'file' | 'dir' | 'missing';
  /**
   * The path to reference in the prompt. Identical to `sourcePath` except
   * when the original filename contained a newline — those are copied into
   * the drop store under a safe name, because a CR inside a bracketed paste
   * can submit half a prompt (research 16 §3).
   */
  refPath: string;
  /** True when `refPath` is a copy main made in the drop store. */
  copied: boolean;
  /** Magic-byte sniff — drives "Drop to attach" vs "Drop to insert path". */
  isImage: boolean;
  /** Size in bytes; 0 for directories and missing paths. */
  bytes: number;
}

export interface DropPrepareResult {
  items: DropPreparedItem[];
}

/** drop:persist — bytes with no filesystem path of their own (⌘V, browser drags). */
export interface DropPersistInput {
  /** Suggested filename from the DataTransfer; may be junk or empty. */
  name: string;
  /** Claimed MIME type. The extension comes from magic bytes regardless. */
  mime: string;
  bytes: Uint8Array;
}

export interface DropPersistResult {
  /** Absolute path inside <userData>/gmux/dropped-images. */
  path: string;
  isImage: boolean;
}

// ---------------------------------------------------------------------------
// APPENDED by the Shift+Enter stream (Phase 12.5/12.6, research 20) — new
// types only. The per-agent multiline table is registry DATA, exactly like
// AgentImageDrop above, and reaches the renderer over `agents:multilineKeys`.
// ---------------------------------------------------------------------------

/** How Shift+Enter reaches one agent's prompt. */
export interface AgentMultilineKey {
  /**
   * The literal bytes Shift+Enter writes into the pane. `null` means this
   * agent has no multiline input, so gmux leaves the key alone rather than
   * risk a stray submit — plain Enter must never break.
   */
  sequence: string | null;
  /** true = a newline was observed hands-on (research 20 §5). */
  verified: boolean;
  notes?: string;
}

/** agents:multilineKeys — the whole per-agent table (static per build). */
export interface MultilineKeyTable {
  /** Registry agents that carry an explicit row. */
  agents: Partial<Record<AgentRegistryId, AgentMultilineKey>>;
  /** Used for shells and for any agent absent from `agents`. */
  fallback: AgentMultilineKey;
}

// ---------------------------------------------------------------------------
// APPENDED by the Phase-13.5 resume stream (docs/research/22-resume-audit.md)
// — new types only, and one optional field on Session (below the fold, so
// nothing above changed). This is the data the UI needs to tell the user
// BEFORE a reboot which sessions come back with their conversation and which
// come back as a bare directory. Discovering that afterwards is the failure
// mode the phase exists to prevent.
// ---------------------------------------------------------------------------

/**
 * Whether this session's conversation can be brought back, as of now.
 *
 *  - `armed`       — a validated conversation id is recorded and `resumeArgv`
 *                    will replay the conversation.
 *  - `capturing`   — the agent only reveals its id after the fact and gmux is
 *                    watching its store. Transient by construction: every
 *                    harvest either lands or times out into `unavailable`.
 *                    It must NEVER be a permanent resting state — a hopeful
 *                    indeterminate is how this bug hid for a whole phase.
 *  - `unavailable` — gmux has no capture route for this agent (droid, which
 *                    nobody has been able to install and verify) or the
 *                    harvest gave up. The session still restores its
 *                    directory and scrollback; the conversation is not armed.
 *                    NOTE this is a statement about gmux, not the agent:
 *                    every installed CLI does have a deterministic resume.
 *  - `none`        — nothing to resume (plain shells).
 *
 * The list is the single source and the type is derived from it (Phase 19
 * item 6). The union it produces is byte-identical to the four literals that
 * were written here before, so this is a same-shape substitution rather than
 * an edit to the alphabet. It is made because the manifest kept its own copy
 * of the same four strings as the parse whitelist, typed `readonly
 * ResumeCapture[]`, and that type accepts a SHORTER list: adding a member here
 * and forgetting the copy compiled cleanly and made every row carrying the new
 * member parse as undefined (research 34 §3.5).
 */
export const RESUME_CAPTURES = [
  'armed',
  'capturing',
  'unavailable',
  'none'
] as const;

export type ResumeCapture = (typeof RESUME_CAPTURES)[number];

// ---------------------------------------------------------------------------
// APPENDED by the Phase-14.5 git-graph data stream (docs/research/24-git-graph.md)
// — new types only, nothing above was modified.
//
// Two things the history pane could not previously say, both blocked HERE and
// not in the renderer:
//
//  1. `git log` walked HEAD only, so commits that exist on `origin/main` but
//     not locally were absent from the payload entirely — "you are 3 behind"
//     was unrenderable at any price. The walk is now REF-SCOPED, which is what
//     puts the upstream on screen as its own line of history.
//  2. Ref badges were cross-referenced by SHA against a separate branch query,
//     so tags never appeared and the two lists could drift. Decorations now
//     ride the walk itself (`--decorate=full` + `%D`) and arrive TYPED.
//
// HONESTY (BACKLOG 14.5): `lastFetchedAt` travels with the divergence numbers
// on purpose. "Up to date" measured against a week-old remote ref is a lie,
// and the UI cannot avoid telling it unless the age is in the same payload.
// ---------------------------------------------------------------------------

/**
 * Which refs the history walk covers. Chosen by the user on the History
 * header; resolved to an explicit refname list, NEVER to `git log --all`
 * (research 24 §4.1: all-refs at depth costs 48 concurrent lanes on a real
 * repo, and `--all` additionally drags in `refs/notes/*` and `refs/stash`,
 * which are not history the user is looking at).
 *
 *  - `branch`     — the current branch and its upstream. THE DEFAULT: 3–5
 *                   lanes at a 50-commit page, and the only scope in which the
 *                   local/origin divergence is the picture rather than noise.
 *  - `local`      — every local branch, plus the current branch's upstream so
 *                   the divergence survives the widening.
 *  - `everything` — local branches, remote-tracking branches and tags.
 */
export type GitLogScope = 'branch' | 'local' | 'everything';

/** What a decoration on a commit row IS, so the UI never guesses from shape. */
export type GitRefKind =
  /** `refs/heads/x` — a local branch. */
  | 'localBranch'
  /** `refs/remotes/origin/x` — a remote-tracking branch. */
  | 'remoteBranch'
  /** `refs/tags/x`. */
  | 'tag'
  /** A bare `HEAD` decoration: HEAD is detached at this commit. */
  | 'head';

/** One typed ref pinned to a commit by the walk (`%D`, `--decorate=full`). */
export interface GitDecorationRef {
  kind: GitRefKind;
  /** Display name: "main", "origin/main", "v1.2.0", "HEAD". */
  name: string;
  /** Full refname as git printed it ("refs/heads/main"); "HEAD" when detached. */
  fullName: string;
  /** True for the local branch HEAD points at (`HEAD -> refs/heads/main`). */
  current?: true;
  /** Remote name for `remoteBranch` refs ("origin"). */
  remote?: string;
}

/**
 * One commit row of the graph: the existing log shape, plus the refs pinned to
 * it and its position relative to the upstream.
 *
 * `unpushed` / `unpulled` are LEFT/RIGHT membership of `HEAD...@{u}` — the
 * same set git counts for ahead/behind — so a row's shading and the header's
 * "3 ahead" can never disagree. Both absent means the commit is on both sides
 * (or the branch has no upstream); they are never both present.
 */
export interface GitGraphLogEntry extends GitLogEntryDetailed {
  /** Typed decorations on this commit; empty for the overwhelming majority. */
  refs: GitDecorationRef[];
  /** Reachable from HEAD, not from the upstream — local work not yet pushed. */
  unpushed?: true;
  /** Reachable from the upstream, not from HEAD — fetched work not yet merged. */
  unpulled?: true;
  /**
   * Phase 198. What this commit did to the ONE path the walk was given,
   * read from the `--name-status -M` chunk that follows the record. Present
   * only on a walk with `GitGraphLogInput.path`; absent on the plain walk,
   * and absent on a row whose chunk git left empty, which is a merge commit
   * on the plain path walk.
   */
  file?: GitGraphLogFile;
}

/**
 * One file's change in one commit, as the file walk reports it. `path` is
 * the path AS OF THAT COMMIT: above a rename it is the new name, and on the
 * rename row `origPath` is the old one, so the row below the boundary carries
 * the old path and `git:commitFileDiff` can read both sides.
 */
export interface GitGraphLogFile {
  path: string;
  /** The old path on an `R` or `C` row. */
  origPath?: string;
  status: GitCommitFileState;
}

/**
 * Where the current branch stands against its upstream, with the freshness of
 * that claim attached.
 */
export interface GitDivergenceInfo {
  /** Current branch short name; null when detached or unborn. */
  branch: string | null;
  /** Upstream short name ("origin/dev"); null when none is configured. */
  upstream: string | null;
  /** Full upstream refname ("refs/remotes/origin/dev"); null when none. */
  upstreamRef: string | null;
  /** True when an upstream IS configured but its ref no longer exists. */
  upstreamGone: boolean;
  /** Commits on HEAD that the upstream does not have. */
  ahead: number;
  /** Commits on the upstream that HEAD does not have. */
  behind: number;
  /** Full SHA of HEAD; null on an unborn branch. */
  headSha: string | null;
  /** Full SHA of the upstream tip; null when there is none, or it is gone. */
  upstreamSha: string | null;
  /** `git merge-base HEAD @{u}`; null when there is no upstream or no ancestor. */
  mergeBase: string | null;
  /**
   * mtime of .git/FETCH_HEAD in epoch ms — when this clone last heard from a
   * remote. Null before any fetch. The UI MUST NOT render "up to date" without
   * consulting this: the numbers above are only as fresh as this timestamp.
   */
  lastFetchedAt: number | null;
  /**
   * True when the per-commit unpushed/unpulled classification hit its cap and
   * some rows carry neither flag despite belonging to one side. `ahead` and
   * `behind` stay exact — git counts those itself.
   */
  truncated: boolean;
}

export interface GitGraphLogInput {
  repoPath: string;
  /** Commits to load. Default 200; the pane opens small and deepens on scroll. */
  maxCount?: number;
  /** Ref scope; default `branch`. Ignored when `refs` is supplied. */
  scope?: GitLogScope;
  /**
   * PIN the walk to an exact refname list — echo back the `refs` of the first
   * page when loading deeper ones.
   *
   * This is the lane-stability contract (research 24 §4.5): row *n*'s lanes are
   * a pure function of commits 0..n, so appending a page reshuffles nothing —
   * PROVIDED the ref set is identical between pages. Re-resolving `scope` on
   * every page would silently break that the moment a branch is created or an
   * agent's `git fetch` lands mid-scroll.
   */
  refs?: string[];
  /**
   * Phase 198. Narrow the walk to ONE repo-relative path. It is passed as a
   * literal pathspec, so `*` and `[` never glob, and every row then carries
   * `GitGraphLogEntry.file`. A path that never existed answers zero rows.
   */
  path?: string;
  /**
   * Phase 198. Follow the path back through its renames and copies with
   * `--follow`. Needs exactly one `path`; the service refuses it otherwise.
   * Merge commits are absent from a followed walk, because `--follow` drops
   * them, and the walk is not topo ordered, because topo order makes git's
   * pathspec rewrite miss rows that were merged after the rename.
   */
  follow?: boolean;
  /**
   * Phase 199. Narrow the walk to what a person typed in the History
   * section's field. Every value reaches git as ONE argv element in its
   * attached form, `--grep=<v>`, `--author=<v>`, `-S<v>`, or after `--` or
   * `--end-of-options`, so a value beginning with a dash can never become a
   * flag. Patterns are fixed strings matched without regard to case. A
   * filtered walk is not topo ordered: it draws no lanes, and the flag reads
   * the whole history when the repository has no commit graph, which
   * measured 395 to 432 ms a keystroke on 82,130 commits against 22 to 41
   * without it.
   */
  search?: GitHistorySearch;
  /**
   * Phase 199. Walks that name the same queue supersede one another: starting
   * one ends the one before it still running, which then rejects. The History
   * section's walks share one per repository, so a keystroke's walk ends the
   * walk of the keystroke before it, and a slow answer never lands over a
   * newer one. Absent, the walk runs to its end whatever else is asked.
   */
  queue?: string;
}

/**
 * What the History section's field narrows the walk by (Phase 199). Every
 * field is optional and an empty one contributes nothing, so a query that is
 * only an operator is the plain walk. Line breaks in a value fold to a space
 * before git sees it, because a newline inside `--grep=` is a second pattern
 * and a trailing one matches every commit.
 */
export interface GitHistorySearch {
  /** `--grep=`: commits whose message holds this text. */
  message?: string;
  /** `--author=`: commits whose author name or email holds this text. */
  author?: string;
  /**
   * One commit, named however `rev-parse --verify` accepts it. The walk is
   * that one row and `hasMore` is false, or no row when nothing resolves.
   */
  commit?: string;
  /**
   * A repository relative path, passed as a literal pathspec after `--`. It
   * matches whole path components: `src/main` narrows to that folder, and
   * `src/ma` narrows to nothing.
   */
  path?: string;
  /**
   * `-S`: commits that changed how often this text occurs. It reads every
   * touched blob in the walk, so it is seconds rather than milliseconds and
   * runs from the field's own button rather than from a keystroke.
   */
  change?: string;
}

/** git:graphLog — everything one history render needs, in one round trip. */
export interface GitGraphLogResult {
  /** The resolved repo root the walk ran in. */
  repoPath: string;
  /** The scope that produced `refs` (echoed back for the header control). */
  scope: GitLogScope;
  /**
   * The exact full refnames the walk covered, sorted. Feed this back as
   * `GitGraphLogInput.refs` when paging (see that field).
   */
  refs: string[];
  /** Newest-first, `--topo-order`: a parent NEVER precedes any of its children. */
  entries: GitGraphLogEntry[];
  /** True when git had at least one commit beyond `maxCount` (limit+1 probe). */
  hasMore: boolean;
  divergence: GitDivergenceInfo;
  /** False for a folder that is not a git worktree; `entries` is then empty. */
  isRepo: boolean;
  /**
   * Whether this repo has a commit-graph file. `--topo-order` must walk the
   * whole history to compute in-degrees, which measures 0.53 s on a
   * 130k-commit repo WITHOUT this file and 0.01 s with it (research 24 §9.1) —
   * a 53× cliff. Exposed so a slow history pane can be explained rather than
   * mistaken for a bug; gmux never writes the file behind the user's back.
   */
  hasCommitGraph: boolean;
}
