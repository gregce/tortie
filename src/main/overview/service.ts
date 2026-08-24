/**
 * The Catch Me Up service (Phase 137, spec section 7.2).
 *
 * One call answers one project. The service lists the project's manifest rows
 * READ ONLY, resolves each agent row to its own log file, reads what changed
 * since the last open through the per provider keep map, writes the redacted
 * slice into the overview store, asks git whether the paths the turns named
 * changed, and builds the payload FROM STORE ROWS ONLY, so nothing the page
 * draws has skipped redaction.
 *
 * What this file never does: it never opens the manifest writable, never
 * spawns an agent, never touches tmux, never sets a session's status, and
 * never lets one unreadable file reject the channel. A file that cannot be
 * read becomes one session line that says so.
 */

import { basename } from 'node:path';
import type {
  OverviewLineKind,
  OverviewProject,
  OverviewProjectInput,
  OverviewReadWork,
  OverviewSessionsInput,
  OverviewSessionView,
  OverviewTurnView
} from '@shared/overview';
import type { AgentRegistryId } from '@shared/types';
import { getRegistryEntry } from '../agents/registry';
import type { ManifestSessionRecord, ManifestStore } from '../manifest';
import { markTurn, readGitEvidence, type GitEvidence } from './git-mark';
import {
  keepMapHash,
  providerMap,
  providerVersion,
  readSessionLog,
  resolveSessionLog
} from './reader';
import type { ReadResult } from './reader';
import type { OverviewStore, StoredSession, StoredTurn } from './store';

/** Turns per session when the caller names none. */
const DEFAULT_TURN_LIMIT = 50;

/** The cap main holds `turnLimit` to, whatever the renderer asks for. */
const MAX_TURN_LIMIT = 200;

/** The payload text clip. The store keeps the full text. */
const CLIP_CHARACTERS = 4_000;

export interface OverviewServiceDeps {
  /** The same getter registerContextIpc takes, because the manifest opens during boot. */
  manifest(): Promise<ManifestStore>;
  /** Opened once, lazily, by the registrar. */
  store(): OverviewStore;
  /** Passed through to resolveSessionLog. Defaults to the process's own home. */
  home?: string;
  /**
   * Has a person picked an agent to write the project line (Phase 138)?
   *
   * THE READ PATH ASKS THIS, not only the scheduler. Settings then Project
   * line tells a person that picking None brings the built line straight back,
   * and without this seam that sentence was false: None stopped new folds and
   * left every sentence already written on the page forever, because no newer
   * row would ever replace one. It is a function rather than a value because
   * the choice can change between two calls.
   *
   * It defaults to false, so a caller that does not pass it draws Phase 137's
   * built line. That is the shipped answer and the safe direction.
   */
  foldChosen?(): boolean;
  now?: () => number;
}

/**
 * One project, every session, the latest turn of each. Reads logs, writes the
 * store, answers from the store.
 */
export function projectOverview(
  deps: OverviewServiceDeps,
  input: OverviewProjectInput
): Promise<OverviewProject> {
  return buildOverview(deps, input.projectPath, null, 1, true);
}

/** The named sessions with their last turns. The same read path, filtered. */
export function sessionsOverview(
  deps: OverviewServiceDeps,
  input: OverviewSessionsInput
): Promise<OverviewProject> {
  const limit = Math.max(
    1,
    Math.min(input.turnLimit ?? DEFAULT_TURN_LIMIT, MAX_TURN_LIMIT)
  );
  // withSummary is FALSE here, and that is the whole of the entry's second
  // strongest refusal. The one session view and the multiplexed view read
  // this channel, so they are re-read from the store and stay verbatim. A
  // model's sentence can never reach them, because the field they would draw
  // it from is never filled on this payload.
  return buildOverview(
    deps,
    input.projectPath,
    new Set(input.sessionIds),
    limit,
    false
  );
}

// ---------------------------------------------------------------------------
// The walk
// ---------------------------------------------------------------------------

/** What one manifest row became after the read step, before the git step. */
interface RowState {
  row: ManifestSessionRecord;
  /** The provider id when one is known, or null for a shell or a remote row. */
  provider: string | null;
  line: OverviewLineKind;
  lineDetail: string | null;
  work: OverviewReadWork;
  turns: StoredTurn[];
  model: string | null;
  branch: string | null;
  lastTouchedAtMs: number | null;
}

async function buildOverview(
  deps: OverviewServiceDeps,
  projectPath: string,
  only: ReadonlySet<string> | null,
  turnLimit: number,
  withSummary: boolean
): Promise<OverviewProject> {
  const manifest = await deps.manifest();
  const store = deps.store();
  const now = (deps.now ?? Date.now)();

  const rows = manifest
    .listSessions()
    .filter(
      (row) =>
        row.projectPath === projectPath &&
        row.status !== 'discarded' &&
        (only === null || only.has(row.id))
    );

  const recordedProviders = new Set<string>();
  const states = rows.map((row) =>
    readOneRow(deps, store, row, projectPath, turnLimit, recordedProviders, now)
  );

  // The two git reads run once per call, and both are awaited before the
  // payload is built. The since floor is the oldest ask shown. A turn with
  // no clock contributes its session's createdAt instead, and a project with
  // no turns at all falls back to its oldest session, then to now.
  const floors: number[] = [];
  for (const state of states) {
    for (const turn of state.turns) {
      floors.push(parseIsoMs(turn.askAt) ?? state.row.createdAt);
    }
  }
  if (floors.length === 0) {
    for (const state of states) floors.push(state.row.createdAt);
  }
  const sinceMs = floors.length > 0 ? Math.min(...floors) : now;
  const evidence = await readGitEvidence(projectPath, sinceMs);

  // Phase 138. A model's sentence is drawn only while a person's choice says
  // so. `withSummary` is the channel's answer and `foldChosen` is the
  // person's, and both must say yes.
  const drawSummary = withSummary && (deps.foldChosen?.() ?? false);
  const sessions = orderSessions(
    states.map((state) =>
      toSessionView(state, evidence, store, projectPath, now, drawSummary)
    )
  );
  const reads: Record<string, OverviewReadWork> = {};
  for (const state of states) reads[state.row.id] = state.work;

  return {
    projectPath,
    projectName: basename(projectPath),
    readAt: now,
    isGitRepo: evidence.isGitRepo,
    sessions,
    reads
  };
}

/**
 * One manifest row through resolve, read and store. Never throws: a file that
 * cannot be read becomes the `unreadable` line and the walk continues.
 */
function readOneRow(
  deps: OverviewServiceDeps,
  store: OverviewStore,
  row: ManifestSessionRecord,
  projectPath: string,
  turnLimit: number,
  recordedProviders: Set<string>,
  now: number
): RowState {
  const prior = store.getSession(row.id);

  if (row.machine !== undefined) {
    store.upsertSession(carryForward(row, prior, row.agent, 'remote', null));
    return quietState(row, prior, null, 'remote', null);
  }
  if (row.agent === 'shell') {
    store.upsertSession(carryForward(row, prior, 'shell', 'shell', null));
    return quietState(row, prior, null, 'shell', null);
  }

  const location = resolveSessionLog(
    {
      agent: row.agent,
      agentSessionId: row.agentSessionId ?? null,
      cwd: row.cwd,
      createdAt: row.createdAt,
      storePathHint: row.resumeProvenance?.storePath ?? null
    },
    { home: deps.home }
  );

  if (location.state === 'no-file') {
    store.upsertSession(carryForward(row, prior, location.provider, 'no-file', null));
    return quietState(row, prior, location.provider, 'no-turns', null);
  }
  if (location.state === 'no-store') {
    const honest = honestFor(location.provider);
    const stored = carryForward(row, prior, location.provider, 'no-store', null);
    stored.honest = honest;
    store.upsertSession(stored);
    return quietState(row, prior, location.provider, 'no-store', honest);
  }
  if (location.state === 'wrong-conversation') {
    const stored = carryForward(
      row,
      prior,
      location.provider,
      'wrong-conversation',
      location.detail
    );
    stored.logPath = location.file;
    store.upsertSession(stored);
    return quietState(
      row,
      prior,
      location.provider,
      'wrong-conversation',
      location.detail
    );
  }
  if (location.state === 'unsupported') {
    store.upsertSession(carryForward(row, prior, location.provider, 'no-store', null));
    return quietState(row, prior, location.provider, 'no-store', null);
  }

  const provider = location.provider;
  const mapVersion = providerVersion(provider);
  const watermark =
    prior !== null &&
    prior.mapVersionAtLastRead === mapVersion &&
    prior.logPath === location.file
      ? prior.watermark
      : null;

  let result: ReadResult;
  try {
    result = readSessionLog({
      provider,
      file: location.file,
      sessionId: location.sessionId,
      cwd: row.cwd,
      projectPath,
      watermark
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    const stored = carryForward(row, prior, provider, 'unreadable', detail);
    stored.logPath = location.file;
    store.upsertSession(stored);
    return quietState(row, prior, provider, 'unreadable', detail);
  }

  const sessionRow: StoredSession = {
    sessionId: row.id,
    agent: row.agent,
    provider,
    agentSessionId: row.agentSessionId ?? null,
    logPath: location.file,
    watermark: result.watermark ?? watermark,
    mapVersionAtLastRead: mapVersion,
    lastReadAt: now,
    readState: 'ok',
    readDetail: null,
    lastTouchedAt: result.lastTouchedAt ?? prior?.lastTouchedAt ?? null,
    model: result.meta.model ?? prior?.model ?? null,
    branch: result.meta.branch ?? prior?.branch ?? null,
    honest: result.honest
  };
  store.upsertSession(sessionRow);
  if (result.work !== 'none') {
    const fromIndex = result.turns[0]?.index ?? result.watermark?.turnIndex ?? 0;
    store.replaceTurnsFrom(
      row.id,
      fromIndex,
      result.turns,
      result.watermark,
      mapVersion,
      now
    );
  }
  if (!recordedProviders.has(provider)) {
    store.recordProviderMap(provider, mapVersion, keepMapHash(), now);
    recordedProviders.add(provider);
  }

  const turns = store.listTurns(row.id, turnLimit);
  return {
    row,
    provider,
    line: turns.length > 0 ? 'turns' : 'no-turns',
    lineDetail: null,
    work: result.work,
    turns,
    model: sessionRow.model,
    branch: sessionRow.branch,
    lastTouchedAtMs: parseIsoMs(sessionRow.lastTouchedAt)
  };
}

// ---------------------------------------------------------------------------
// The fold's read (Phase 138)
// ---------------------------------------------------------------------------

/**
 * Bring ONE session's stored turns up to date, for the fold.
 *
 * It is the same read path the page uses, on one row rather than a project.
 * It resolves the log, reads what changed since the watermark, writes the
 * redacted slice into the store, and answers with STORE ROWS, so what the
 * fold sends has been through redaction exactly as what the page draws has.
 * It runs no git command, because the model never writes the git mark.
 *
 * Returns null for a row this phase has nothing to send for, being a shell, a
 * remote session, a provider with no readable store, and a file that could
 * not be read. The scheduler drops the boundary and the page keeps Phase
 * 137's built line.
 */
export async function refreshSessionForFold(
  deps: OverviewServiceDeps,
  sessionId: string
): Promise<{ turns: StoredTurn[]; providerMapVersion: number } | null> {
  const manifest = await deps.manifest();
  const store = deps.store();
  const now = (deps.now ?? Date.now)();
  const row = manifest
    .listSessions()
    .find((candidate) => candidate.id === sessionId);
  if (row === undefined || row.status === 'discarded') return null;
  if (row.machine !== undefined || row.agent === 'shell') return null;

  const state = readOneRow(
    deps,
    store,
    row,
    row.projectPath,
    MAX_TURN_LIMIT,
    new Set<string>(),
    now
  );
  if (state.provider === null || state.line !== 'turns') return null;
  // readOneRow already listed the tail, bounded by MAX_TURN_LIMIT. Reading it
  // again unbounded would grow with the session, and the fold's whole promise
  // is that its cost per turn stays flat as a session grows.
  return {
    turns: state.turns,
    providerMapVersion: providerVersion(state.provider)
  };
}

// ---------------------------------------------------------------------------
// The view build. Store rows in, wire shapes out.
// ---------------------------------------------------------------------------

function toSessionView(
  state: RowState,
  evidence: GitEvidence,
  store: OverviewStore,
  projectPath: string,
  now: number,
  withSummary: boolean
): OverviewSessionView {
  const turns: OverviewTurnView[] = state.turns.map((turn) => {
    const mark = markTurn(evidence, {
      paths: turn.paths,
      answerText: turn.answerText,
      askAtMs: parseIsoMs(turn.askAt),
      sessionCreatedAtMs: state.row.createdAt,
      cwd: state.row.cwd,
      projectPath
    });
    store.setGitVerdict(state.row.id, turn.index, mark.git, now);
    const ask = clip(turn.askText);
    const answer = turn.answerText === null ? null : clip(turn.answerText);
    return {
      index: turn.index,
      askText: ask.text,
      askClipped: ask.clipped,
      askAt: turn.askAt,
      answerText: answer === null ? null : answer.text,
      answerClipped: answer !== null && answer.clipped,
      answerAt: turn.answerAt,
      closed: turn.closed,
      interrupted: turn.interrupted,
      notice: turn.notice,
      git: mark.git,
      namedOnlyOutside: mark.namedOnlyOutside
    };
  });
  return {
    sessionId: state.row.id,
    name: state.row.name,
    agent: state.row.agent,
    agentLabel: labelFor(state.row.agent),
    model: state.model,
    branch: state.branch,
    line: state.line,
    lineDetail: state.lineDetail,
    askOnly: state.provider === 'gemini',
    noTurnClock: state.provider === 'deepseek',
    startedAt: state.row.createdAt,
    lastTouchedAt: state.lastTouchedAtMs,
    turns,
    summary: withSummary
      ? writtenLineFor(store, state.row.id, newestTurnIndex(state))
      : null
  };
}

/** The index of the newest stored turn, or null when the session has none. */
function newestTurnIndex(state: RowState): number | null {
  // listTurns answers oldest first, so the last member is the newest turn.
  return state.turns.at(-1)?.index ?? null;
}

/**
 * The one sentence a model wrote, or null.
 *
 * TWO THINGS DECIDE, and both of them are the same failure.
 *
 * The NEWEST row is what is read, whatever its verdict, and a refused newest
 * row deliberately does NOT fall back to an older kept one.
 *
 * A kept row is then drawn only when it covers the newest turn the store
 * holds. The written sentence replaces the WHOLE line, the ask included, so a
 * sentence written for an older turn would leave a person reading about a turn
 * that is no longer the one on screen, with nothing saying so. That happens in
 * ordinary use rather than in a corner: folding is suspended by the rate
 * window, or the project is closed, or Tortie quits with a settle timer armed,
 * and the session keeps taking turns.
 *
 * A turn that is still in flight counts, because the built line reports it and
 * a sentence about the turn before it does not. So the written line steps
 * aside while a turn runs and comes back when the next fold lands. The
 * fallback is Phase 137's built line, which is current by construction.
 */
function writtenLineFor(
  store: OverviewStore,
  sessionId: string,
  newestTurn: number | null
): string | null {
  const row = store.latestSummary(sessionId);
  if (row === null || row.verdict !== 'kept') return null;
  if (newestTurn === null || row.toTurn < newestTurn) return null;
  const text = row.text;
  return text === null || text === '' ? null : text;
}

/**
 * The payload order: sessions with turns by lastTouchedAt descending, then
 * the rows with nothing to show by startedAt descending, then shells.
 */
function orderSessions(views: OverviewSessionView[]): OverviewSessionView[] {
  const talked = views.filter((view) => view.line === 'turns');
  const quiet = views.filter(
    (view) => view.line !== 'turns' && view.line !== 'shell'
  );
  const shells = views.filter((view) => view.line === 'shell');
  talked.sort(
    (a, b) =>
      (b.lastTouchedAt ?? b.startedAt) - (a.lastTouchedAt ?? a.startedAt)
  );
  quiet.sort((a, b) => b.startedAt - a.startedAt);
  shells.sort((a, b) => b.startedAt - a.startedAt);
  return [...talked, ...quiet, ...shells];
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** A row that was not read this call. Stored turns and meta are kept as they were. */
function quietState(
  row: ManifestSessionRecord,
  prior: StoredSession | null,
  provider: string | null,
  line: OverviewLineKind,
  lineDetail: string | null
): RowState {
  return {
    row,
    provider,
    line,
    lineDetail,
    work: 'skipped',
    turns: [],
    model: prior?.model ?? null,
    branch: prior?.branch ?? null,
    lastTouchedAtMs: parseIsoMs(prior?.lastTouchedAt ?? null)
  };
}

/**
 * The store row for a session that was not read this call. Everything the
 * store already knew is carried forward, so a later successful read can still
 * resume from its watermark.
 */
function carryForward(
  row: ManifestSessionRecord,
  prior: StoredSession | null,
  provider: string,
  readState: StoredSession['readState'],
  readDetail: string | null
): StoredSession {
  return {
    sessionId: row.id,
    agent: row.agent,
    provider,
    agentSessionId: row.agentSessionId ?? null,
    logPath: prior?.logPath ?? null,
    watermark: prior?.watermark ?? null,
    mapVersionAtLastRead: prior?.mapVersionAtLastRead ?? null,
    lastReadAt: prior?.lastReadAt ?? null,
    readState,
    readDetail,
    lastTouchedAt: prior?.lastTouchedAt ?? null,
    model: prior?.model ?? null,
    branch: prior?.branch ?? null,
    honest: prior?.honest ?? null
  };
}

/** The map's honest sentence for one provider, or null when the map has none. */
function honestFor(provider: string): string | null {
  const block = providerMap(provider) as unknown as { honest?: unknown } | null;
  const honest = block?.honest;
  return typeof honest === 'string' ? honest : null;
}

function labelFor(agent: string): string {
  if (agent === 'shell') return 'Shell';
  try {
    return getRegistryEntry(agent as AgentRegistryId).displayName;
  } catch {
    return agent;
  }
}

function parseIsoMs(iso: string | null): number | null {
  if (iso === null) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

function clip(text: string): { text: string; clipped: boolean } {
  if (text.length <= CLIP_CHARACTERS) return { text, clipped: false };
  return { text: text.slice(0, CLIP_CHARACTERS), clipped: true };
}
