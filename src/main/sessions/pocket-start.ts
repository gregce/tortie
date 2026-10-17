/**
 * THE PHONE'S START, implemented once (Phase 346, build/p346/SPEC.md §4.6,
 * D7 to D16): what a phone may start, and the start itself.
 *
 * The phone's door declares what it may ask for (`PocketWrites.start` and
 * `PocketFacts.start` in `../pocket/routes.ts`) and cannot name this module
 * (`conformance:pocket` R3). `../capabilities.ts` builds it once and hands the
 * two members in, beside the End, the reply and the keys.
 *
 * ## The offer starts nothing (D8)
 *
 * The Sessions answer carries the offer on every read, so composing it must
 * cost a read and never a process. This Mac's installed agents are the last
 * RESOLVED detection scan when one exists; else, for each compiled launchable
 * agent, the MERGED row the create path itself reads (so an `agents.json`
 * patch that renames a binary is honoured, and a hidden row's real binary is
 * never offered), its candidate names resolved against the login-shell PATH a
 * capture already settled, with the row's own folders and then Tortie's install
 * folders, exactly as detection walks them; else nothing, said as not read.
 * Another machine's agents are the ones Tortie already holds in memory for it,
 * `present` only (his answer 6: "ONLY the ones that are installed"). Nothing
 * here starts a login shell, a version probe, a scan or an ssh.
 *
 * ## The act is the Mac's own one-press create (D12, D13)
 *
 * A start names a project main offered and an agent, and nothing else. The act
 * re-reads the project by id, asks the machine's readiness for a project on a
 * machine, asks the installed agents again, composes EXACTLY the
 * `CreateSessionInput` the window's `quickCreate` composes for that project
 * and agent ({@link composeStartInput}), asks `still` once more, and calls the
 * one guarded create. Nothing is awaited from the first read to the create.
 *
 * ## What this module never does
 *
 * It takes no path, folder, argument, environment, name, login, sign in,
 * first prompt or machine from the phone: the two ids are compared with `===`
 * against what the Mac holds, and everything the create is handed comes from
 * the project row, the shared name rule and the person's own settings. It sets
 * no status, logs nothing, moves no focus on the Mac (a phone's start must not
 * take the Mac's window), and never reads what an error SAYS: a failure is
 * told apart by its code alone.
 */

import type {
  PocketSessionsStart,
  PocketStartAgent,
  PocketStartOffer,
  PocketStartPlace,
  PocketStartProject
} from '@shared/ipc/pocket';
import { POCKET_START_AGENTS_MAX, POCKET_START_PROJECTS_MAX, POCKET_WRITE_SENTENCES } from '@shared/ipc/pocket';
import { displayPath } from '@shared/display-path';
import { ordinalName } from '@shared/session-names';
import {
  captureDefaultFor,
  defaultLaunchArgs,
  type AgentFlagCatalogs,
  type GmuxSettings
} from '@shared/settings';
import {
  START_AGENT_GONE,
  START_FAILED,
  START_FOLDER_GONE,
  START_INTERPRETER,
  START_MACHINE_AWAY,
  START_PROJECT_GONE
} from '@shared/start-copy';
import type { AgentKind, CreateSessionInput, LaunchableAgentId, Project, Session } from '@shared/types';
import { LOCAL_MACHINE_ID, sameTarget, targetOfProject, targetOfSession } from '@shared/workspace-target';
import { expandDirs, peekDetectedAgents } from '../agents/detection';
import { getRegistryEntry, LAUNCHABLE_AGENT_IDS } from '../agents/registry';
import { launchableAgentEntry } from '../config/store';
import { isGmuxError } from '../errors';
import { machineRowStatus } from '../machines/confirm';
import { machineAgentsView } from '../machines/machine-agents';
import { readyRemoteContext } from '../machines/ready-context';
import { machineFeedAnswering } from '../machines/remote-run';
import { machineFieldsOf, machineLabelOf, machineRow } from '../machines/store';
import { clipSessionText, type PocketStartInput, type PocketStartOutcome, type PocketStillAllowed } from '../pocket/routes';
import { getFlagCatalogViews } from '../settings/ipc';
import { getSettings } from '../settings/store';
import { extraBinDirs, resolveBinaryAgainst, userPathNow } from '../tmux/resolve';
import { binaryCandidatesOf } from './launch-plan';

// ---------------------------------------------------------------------------
// Pure: the create's input, the danger line, the offer
// ---------------------------------------------------------------------------

/** Where a project lives: `local`, or the machine its files are on. */
function placeOfProject(project: Pick<Project, 'machineId'>): string {
  return project.machineId !== undefined && project.machineId !== LOCAL_MACHINE_ID ? project.machineId : LOCAL_MACHINE_ID;
}

/** The sessions of one project, by the window's own rule (`projectSessions`). */
function sessionsOfProject(project: Project, sessions: readonly Session[]): Session[] {
  const target = targetOfProject(project);
  return sessions.filter((session) => sameTarget(targetOfSession(session), target));
}

/**
 * PURE: EXACTLY `quickCreate`'s input (D13): `src/renderer/state/sessions-slice.ts`'s
 * `quickCreate` and the `createSession` it calls, for a project the window
 * has open and an agent, in the order that object is written.
 *
 *  - `name`: `<agent>-<n>` by the shared ordinal, then the shared dedupe, over
 *    the project's own sessions;
 *  - `projectPath`: the project's path;
 *  - for a project on a machine, `projectMachineId` and `machineId`, both that
 *    machine (the tab rule);
 *  - `agent`;
 *  - `extraArgs`: the person's launch defaults (`defaultLaunchArgs`, verified
 *    and, for a flag that turns a safeguard off, sealed), only when there are
 *    any;
 *  - `capture: true` only when the person's capture default is on.
 *
 * And no `cwd`, `startAnyway`, `login` or `signIn`: a one-press create sends
 * none of them, and a phone may not.
 */
export function composeStartInput(input: {
  project: Project;
  agent: LaunchableAgentId;
  sessions: readonly Session[];
  settings: Pick<GmuxSettings, 'launchDefaults' | 'captureDefaults'>;
  catalogs: AgentFlagCatalogs;
}): CreateSessionInput {
  const { project, agent } = input;
  const place = placeOfProject(project);
  const remote = place !== LOCAL_MACHINE_ID;
  const extraArgs = defaultLaunchArgs(agent, input.settings, input.catalogs);
  const capture = captureDefaultFor(input.settings, agent);
  return {
    name: ordinalName(agent, sessionsOfProject(project, input.sessions)),
    projectPath: project.path,
    ...(remote ? { projectMachineId: place } : {}),
    // The wire cast the window makes in exactly one place (`createSession`).
    agent: agent as AgentKind,
    ...(extraArgs.length > 0 ? { extraArgs } : {}),
    ...(capture ? { capture: true } : {}),
    ...(remote ? { machineId: place } : {})
  };
}

/**
 * PURE: the labels of an agent's launch defaults that turn a safeguard off and
 * would apply to a start (verified, danger, on), joined by `, `, or null (D7).
 * `settings` is main's own read, from which an unsealed danger flag is already
 * gone (`src/main/settings/store.ts`), so a label here is one the person
 * switched on in the Settings window.
 */
export function startDangerOf(
  agent: string,
  settings: Pick<GmuxSettings, 'launchDefaults'>,
  catalogs: AgentFlagCatalogs
): string | null {
  const catalog = (catalogs as Record<string, AgentFlagCatalogs[LaunchableAgentId] | undefined>)[agent];
  const enabled = (settings.launchDefaults as Record<string, string[] | undefined>)[agent] ?? [];
  if (catalog === undefined || enabled.length === 0) return null;
  const labels = catalog.presets.filter((p) => p.verified && p.danger && enabled.includes(p.flag)).map((p) => p.label);
  return labels.length === 0 ? null : labels.join(', ');
}

/** What one place answers: whether a start may run there now, and what is installed. */
export interface StartPlaceFacts {
  readonly ready: boolean;
  readonly read: boolean;
  readonly agents: readonly string[];
}

/**
 * The project preselected (D10): the listed project holding the session with
 * the latest `createdAt`, ties by the larger id; with none, the first listed
 * project; with no project, null.
 */
function chosenProjectOf(projects: readonly Project[], sessions: readonly Session[]): string | null {
  let best: { session: Session; project: Project } | null = null;
  for (const session of sessions) {
    const target = targetOfSession(session);
    const project = projects.find((p) => sameTarget(targetOfProject(p), target));
    if (project === undefined) continue;
    const later =
      best === null ||
      session.createdAt > best.session.createdAt ||
      (session.createdAt === best.session.createdAt && session.id > best.session.id);
    if (later) best = { session, project };
  }
  return best?.project.id ?? projects[0]?.id ?? null;
}

/**
 * PURE: THE OFFER (D7, D10, D11). `build/p3333/sample.mjs` calls it over the
 * made-up world, so See a sample is drawn by the shipping composer.
 *
 *  - `projects`: the projects open in Tortie, in `listProjects()`'s order
 *    (this Mac's, then each machine's), at most
 *    {@link POCKET_START_PROJECTS_MAX}; each its id, its tab's name, its
 *    machine's label (null on this Mac), its folder only when another listed
 *    project shares the label and the machine label, and its place;
 *  - `places`: `local` first, then each machine in first appearance, each with
 *    whether a start may run there now (`local` always), whether its agents
 *    were read, and the compiled launchable agents installed there in registry
 *    order (none when not read);
 *  - `agents`: every agent a place lists, once, in registry order;
 *  - `chosen`: D10;
 *  - `defaultAgent`: the person's default agent when it is an agent this offer
 *    lists, else null (D11; a default installed nowhere here is offered by no
 *    place, and naming it would name an agent the offer does not hold).
 *
 * Every drawn string is clipped by the door's one clip.
 */
export function composeStartOffer(input: {
  projects: readonly Project[];
  sessions: readonly Session[];
  places: ReadonlyMap<string, StartPlaceFacts>;
  machineLabel: (machineId: string) => string | null;
  /** The compiled launchable agents, in registry order. */
  agentRows: readonly { id: string; name: string; icon: string }[];
  settings: Pick<GmuxSettings, 'defaultAgent' | 'launchDefaults'>;
  catalogs: AgentFlagCatalogs;
}): PocketStartOffer {
  const listed = input.projects.slice(0, POCKET_START_PROJECTS_MAX);
  const rowIds = input.agentRows.map((row) => row.id);

  // The places, `local` first, then each machine in first appearance.
  const placeIds: string[] = [];
  if (listed.some((p) => placeOfProject(p) === LOCAL_MACHINE_ID)) placeIds.push(LOCAL_MACHINE_ID);
  for (const project of listed) {
    const place = placeOfProject(project);
    if (!placeIds.includes(place)) placeIds.push(place);
  }
  const places: PocketStartPlace[] = placeIds.map((id) => {
    const facts = input.places.get(id);
    const read = facts?.read === true;
    const installed = read ? (facts?.agents ?? []) : [];
    return {
      id,
      ready: id === LOCAL_MACHINE_ID ? true : facts?.ready === true,
      read,
      agents: rowIds.filter((agent) => installed.includes(agent))
    };
  });

  // The agents any place lists, once, in registry order.
  const agents: PocketStartAgent[] = input.agentRows
    .filter((row) => places.some((place) => place.agents.includes(row.id)))
    .slice(0, POCKET_START_AGENTS_MAX)
    .map((row) => {
      const danger = startDangerOf(row.id, input.settings, input.catalogs);
      return {
        id: row.id,
        name: clipSessionText(row.name),
        icon: row.icon,
        danger: danger === null ? null : clipSessionText(danger)
      };
    });
  const offered = new Set(agents.map((agent) => agent.id));
  for (const place of places) place.agents = place.agents.filter((agent) => offered.has(agent));

  // The projects, a folder only where two would read alike.
  const drawn = listed.map((project) => {
    const place = placeOfProject(project);
    const machine = place === LOCAL_MACHINE_ID ? null : clipSessionText(input.machineLabel(place) ?? place);
    return { project, place, label: clipSessionText(project.name), machine };
  });
  const projects: PocketStartProject[] = drawn.map((one) => {
    const twin = drawn.some((other) => other !== one && other.label === one.label && other.machine === one.machine);
    return {
      id: one.project.id,
      label: one.label,
      machine: one.machine,
      folder: twin
        ? clipSessionText(displayPath(one.project.path, one.place === LOCAL_MACHINE_ID ? undefined : one.place))
        : null,
      place: one.place
    };
  });

  const defaultAgent = input.settings.defaultAgent;
  return {
    state: 'offered',
    projects,
    places,
    agents,
    chosen: chosenProjectOf(listed, input.sessions),
    defaultAgent: offered.has(defaultAgent) ? defaultAgent : null
  };
}

// ---------------------------------------------------------------------------
// Reads that start nothing
// ---------------------------------------------------------------------------

/**
 * This Mac's installed compiled launchable agents, in registry order, read
 * WITHOUT STARTING ANYTHING (D8), or null when Tortie has not read them yet.
 *
 *  1. The last RESOLVED detection scan, when one exists: its installed,
 *     launchable rows.
 *  2. Else the login-shell PATH a capture already settled: for each compiled
 *     launchable id, the merged row the create path reads, its candidate
 *     names, resolved against that PATH, the row's own folders and then
 *     Tortie's install folders, as detection walks them.
 *  3. Else null: no scan has resolved and no PATH has settled.
 */
export function localInstalledAgents(): readonly LaunchableAgentId[] | null {
  const scan = peekDetectedAgents();
  if (scan !== null) {
    const installed = scan.agents.filter((agent) => agent.installed && agent.launchable).map((agent) => agent.id);
    return LAUNCHABLE_AGENT_IDS.filter((id) => installed.includes(id));
  }
  const path = userPathNow();
  if (path === null) return null;
  const found: LaunchableAgentId[] = [];
  for (const id of LAUNCHABLE_AGENT_IDS) {
    const merged = launchableAgentEntry(id);
    if (merged === null) continue;
    const dirs = [...expandDirs(merged.extraProbeDirs), ...extraBinDirs()];
    if (binaryCandidatesOf(id, merged).some((bin) => resolveBinaryAgainst(bin, path, dirs) !== null)) found.push(id);
  }
  return found;
}

/**
 * One machine's installed compiled launchable agents, from what Tortie holds
 * in memory for it, `present` only (his answer 6), or null when nothing about
 * it was read (every agent `unknown`). Starts nothing and asks the machine
 * nothing.
 */
function machineInstalledAgents(machineId: string): readonly string[] | null {
  const view = machineAgentsView(machineId);
  if (!view.agents.some((agent) => agent.presence !== 'unknown')) return null;
  const present = view.agents.filter((agent) => agent.presence === 'present').map((agent) => agent.agentId);
  return LAUNCHABLE_AGENT_IDS.filter((id) => present.includes(id));
}

/**
 * Whether a start may run on a machine NOW: its row is confirmed (the `usable`
 * the ⌘T sheet reads), Tortie is signed in to it with its program list read
 * for this connection (`readyRemoteContext`), AND the machine is ANSWERING by
 * the session verbs' own rule (`machineFeedAnswering`, `../machines/liveness.ts`:
 * the link answers and the last session list completed). Reads memory and the
 * confirm record; asks the machine nothing.
 *
 * PHASE 346's FIX ROUND. The first two alone read a machine whose ssh had
 * stalled as ready for as long as its connection stayed up: with the loopback
 * machine's sshd paused for 150 s the offer never dimmed it, although main had
 * logged `did not answer the last list` 13 s in, so the `machine` refusal §3.1
 * promises for a machine that stopped answering never happened and a start
 * there would hold the Mac's one start in flight until the create's own reads
 * gave up. A missed or not yet completed list is now `Not connected` in the
 * offer and `refused` `machine` at the act; the next list that completes makes
 * it ready again.
 */
function machineReadyNow(machineId: string): boolean {
  const row = machineRow(machineId);
  if (row === null) return false;
  if (machineRowStatus(row.id, machineFieldsOf(row)).state !== 'confirmed') return false;
  try {
    readyRemoteContext(machineId);
  } catch {
    return false;
  }
  return machineFeedAnswering(machineId);
}

/** A machine's drawn label, or null when Tortie holds no row for it. */
function machineLabelNow(machineId: string): string | null {
  const row = machineRow(machineId);
  return row === null ? null : machineLabelOf(row);
}

/** The compiled launchable agents as the offer draws them, in registry order. */
function compiledAgentRows(): { id: string; name: string; icon: string }[] {
  return LAUNCHABLE_AGENT_IDS.map((id) => {
    const entry = getRegistryEntry(id);
    return { id, name: entry.displayName, icon: entry.iconKey };
  });
}

// ---------------------------------------------------------------------------
// The one implementation
// ---------------------------------------------------------------------------

/** What the start reads from the session core. Every member but the create is a read. */
export interface PocketStartCore {
  listProjects(): readonly Project[];
  listSessions(): readonly Session[];
  /** The Mac's own one guarded create. */
  createSession(input: CreateSessionInput): Promise<Session>;
}

/** A refusal, worded. */
function refused(
  reason: 'project' | 'agent' | 'machine' | 'interpreter' | 'stopped',
  sentence: string
): PocketStartOutcome {
  return { outcome: 'refused', reason, sentence };
}

/**
 * What a thrown create came to, told apart BY CODE ONLY (D12). No error's text
 * is read: a failed command's text can carry its argv.
 */
function thrownStart(err: unknown): PocketStartOutcome {
  if (isGmuxError(err, 'PROJECT_NOT_FOUND')) return refused('project', START_FOLDER_GONE);
  if (isGmuxError(err, 'AGENT_NOT_FOUND') || isGmuxError(err, 'AGENT_NOT_ON_MACHINE')) {
    return refused('agent', START_AGENT_GONE);
  }
  if (isGmuxError(err, 'AGENT_INTERPRETER_MISSING')) return refused('interpreter', START_INTERPRETER);
  return { outcome: 'failed', sentence: START_FAILED };
}

/** The phone's start, built once by `../capabilities.ts`. */
export function createPocketStart(deps: {
  /** The session core, or null while it has not booted. */
  core: () => PocketStartCore | null;
  /** Production: `getSettings`. Tests inject. */
  settings?: () => GmuxSettings;
  /** Production: `getFlagCatalogViews`. Tests inject. */
  catalogs?: () => AgentFlagCatalogs;
  /** Production: {@link localInstalledAgents}. Tests inject. */
  localAgents?: () => readonly LaunchableAgentId[] | null;
  /** Production: what Tortie holds for the machine, `present` only, or null when nothing was read. */
  machineAgents?: (machineId: string) => readonly string[] | null;
  /** Production: the row confirmed, `readyRemoteContext` answering and the machine's session feed answering. */
  machineReady?: (machineId: string) => boolean;
  /** Production: the machine row's label. */
  machineLabel?: (machineId: string) => string | null;
}): {
  sessionsKey(served: boolean): PocketSessionsStart;
  start(input: PocketStartInput, still: PocketStillAllowed): Promise<PocketStartOutcome>;
} {
  const settings = deps.settings ?? getSettings;
  const catalogs = deps.catalogs ?? getFlagCatalogViews;
  const localAgents = deps.localAgents ?? localInstalledAgents;
  const machineAgents = deps.machineAgents ?? machineInstalledAgents;
  const machineReady = deps.machineReady ?? machineReadyNow;
  const machineLabel = deps.machineLabel ?? machineLabelNow;

  /** The agents installed at one place, read starting nothing. */
  const installedAt = (place: string): readonly string[] | null =>
    place === LOCAL_MACHINE_ID ? localAgents() : machineAgents(place);

  return {
    /**
     * The Sessions answer's `start` key (D1, D9): `waiting` while the route
     * waits for its Allow, else the offer. A READ: synchronous, and it starts
     * nothing. Each place a listed project names is read once.
     */
    sessionsKey(served: boolean): PocketSessionsStart {
      if (!served) return { state: 'waiting' };
      const core = deps.core();
      const projects = (core?.listProjects() ?? []).slice(0, POCKET_START_PROJECTS_MAX);
      const sessions = core?.listSessions() ?? [];
      const places = new Map<string, StartPlaceFacts>();
      for (const project of projects) {
        const place = placeOfProject(project);
        if (places.has(place)) continue;
        const agents = installedAt(place);
        places.set(place, {
          ready: place === LOCAL_MACHINE_ID ? true : machineReady(place),
          read: agents !== null,
          agents: agents ?? []
        });
      }
      return composeStartOffer({
        projects,
        sessions,
        places,
        machineLabel,
        agentRows: compiledAgentRows(),
        settings: settings(),
        catalogs: catalogs()
      });
    },

    /**
     * THE ACT (D12), in this order with NOTHING awaited from the first read to
     * the create: the project re-read by id, its place, a machine's readiness,
     * the agent among the place's installed agents, the input composed, `still`
     * asked once more, then the one guarded create. Never throws.
     */
    async start(input: PocketStartInput, still: PocketStillAllowed): Promise<PocketStartOutcome> {
      const core = deps.core();
      if (core === null) return { outcome: 'failed', sentence: START_FAILED };
      try {
        const project = core.listProjects().find((p) => p.id === input.project);
        if (project === undefined) return refused('project', START_PROJECT_GONE);
        const place = placeOfProject(project);
        if (place !== LOCAL_MACHINE_ID && !machineReady(place)) return refused('machine', START_MACHINE_AWAY);
        const agent = (installedAt(place) ?? []).find((id) => id === input.agent);
        if (agent === undefined) return refused('agent', START_AGENT_GONE);
        const create = composeStartInput({
          project,
          agent: agent as LaunchableAgentId,
          sessions: core.listSessions(),
          settings: settings(),
          catalogs: catalogs()
        });
        // The door's last check, once more, immediately before the create.
        if (!still()) return refused('stopped', POCKET_WRITE_SENTENCES.stopped);
        const session = await core.createSession(create);
        return { outcome: 'done', session: { id: session.id, name: session.name } };
      } catch (err) {
        return thrownStart(err);
      }
    }
  };
}
