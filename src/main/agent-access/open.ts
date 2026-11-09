/**
 * Phase 359, Builder C2 — the validated `open` operation and its main-side
 * handoff plumbing.
 *
 * WHAT THIS FILE OWNS. Decoding the `pathBase64`/`findBase64` locator the
 * dispatcher validated, resolving it against the caller's local project or
 * the open local projects in list order, asking both containment
 * (`resolveInsideRoot`, §2.4 step 4 first arm — the alias-root refusal rides
 * the guard's own `projectClosed` word) and the path door (§2.4 second arm),
 * reading the text through the shared strict helper, converting the line or
 * find locator to the renderer's coordinate contract, and handing the result
 * to the broker. The caller below is a live local session or the answer is
 * `unavailable`; the switch is re-checked immediately before the renderer
 * event goes out, so a switch that moved off in flight answers `disabled`
 * and sends nothing; refused/missing/not-found answers send nothing.
 *
 * WHAT IT NEVER CHOOSES. The wire union, the response shape, the framing and
 * the curated projections — those are Builder A/C1's — and no show, focus,
 * restore, moveTop, app.focus or native activation API is named here. The
 * broker owns the five-second completion and the renderer proof.
 */

import type { WebContents } from 'electron';
import type {
  AgentAccessOpenHandler,
  AgentAccessOpenInvocation,
  AgentAccessOpenValue,
  AgentAccessProjectView
} from '@shared/agent-access';
import { AGENT_ACCESS_MAX_PATH_BYTES } from '@shared/agent-access';
import type { Project, Session } from '@shared/types';
import { LOCAL_MACHINE_ID } from '@shared/workspace-target';
import { answerPathDoor } from '../fs/path-door';
import {
  resolveInsideRoot,
  resolveProjectRoot,
  fsPathRefusalOf
} from '../fs/paths';
import { readTextCapped } from '../fs/read-text';
import type { AgentAccessRendererOpen } from '@shared/ipc/agent-access';
import { deliverAgentAccessOpen, type AgentAccessOpenBroker } from './open-broker';
import { getLog } from '../log';

/** The one logger this module owns: refusals and window answers, no payloads. */
const openLog = getLog('agent-access-open');

/** What the open path needs from the app. Nothing here starts anything. */
export interface AgentAccessOpenDeps {
  /** The plain boolean switch. Re-checked immediately before the event. */
  isEnabled: () => boolean;
  /** The app's current session list. Async: a sync list would pin a stale core. */
  listSessions: () => Promise<Session[]>;
  /** The app's current project rows. Async: a sync list would pin a stale core. */
  listProjects: () => Promise<Project[]>;
  /** The ready main renderer's exact `webContents`, or null when none. */
  mainWindow: () => WebContents | null;
  /** The one broker this service delivers through. */
  broker: AgentAccessOpenBroker;
  /**
   * Whether the main window holds focus. Read once per open; the answer is
   * never taken — only an already-focused window opening the caller's own
   * project may land in the editor.
   */
  windowFocused: () => boolean;
  /**
   * The armed harness checkpoint (drive the race) or null. The checkpoint
   * only NAMES the arm; the pause plumbing arrives in the fix round, so
   * today this is a seam the gate reads for armed/unarmed only.
   */
  harnessCheckpoint?: () => string | null;
}

/** Fixed response pieces. Nothing request-shaped ever rides one. */
const DISABLED_MESSAGE =
  'Agent access is off. Turn it on in Settings → Agents to let sessions use Tortie.';
const UNAVAILABLE_MESSAGE = 'Unknown or unavailable session.';

/**
 * Thrown when the plain switch moved off between validation and the
 * renderer event. Builder C1's dispatch second check answers `disabled`
 * before the open seam runs, but the live replacement race pauses the
 * strict read BETWEEN the two: this is how a switch that moves off mid-
 * flight refuses. The service catch maps it to the closed transport error.
 */
export class OpenDisabledError extends Error {
  constructor() {
    super(DISABLED_MESSAGE);
    this.name = 'OpenDisabledError';
  }
}

/** Thrown when the caller is gone or remote at the pre-event re-check. */
export class OpenUnavailableError extends Error {
  constructor() {
    super(UNAVAILABLE_MESSAGE);
    this.name = 'OpenUnavailableError';
  }
}

export const AGENT_ACCESS_OPEN_ATTEMPT_TIMEOUT_MS = 15_000;

/**
 * PHASE 361: every refusal needs a clock reading, not an alibi.
 *
 * `mainWindow()` answers the window the app is willing to show an open
 * through. In development, that is every window. Packaged, what it returns is
 * main's Electron `BrowserWindow.getAllWindows()`: a DEVTOOLS window counts,
 * a window on another desktop does not, and while the OS is locked or the
 * Space is empty it is whatever Electron still reports.
 *
 * The call logs which of those it is, with the project's name and the
 * requested relative path — never the absolute path — so the next "open
 * reported success" has a receipt behind it and the next silent failure is
 * no longer silent.
 */
function chooseMainWindow(
  mainWindow: AgentAccessOpenDeps['mainWindow'],
  project: { name: string },
  rel: string
): ReturnType<AgentAccessOpenDeps['mainWindow']> {
  const target = mainWindow();
  if (target === null) {
    openLog?.warn?.('agent access open: no window at all', {
      project: project.name,
      rel
    });
  } else if (target.isDestroyed()) {
    openLog?.warn?.('agent access open: the window was destroyed', {
      project: project.name,
      rel
    });
  }
  return target;
}

function refused(
  reason: Extract<
    AgentAccessOpenValue,
    { state: 'refused' }
  >['reason']
): AgentAccessOpenValue {
  return { state: 'refused', reason };
}

function decodeLocator(
  invocation: AgentAccessOpenInvocation
): { path: string; line?: number; endLine?: number; find?: string } | null {
  let rawPath: Buffer;
  try {
    rawPath = Buffer.from(invocation.pathBase64, 'base64');
  } catch {
    return null;
  }
  if (rawPath.length === 0 || rawPath.length > AGENT_ACCESS_MAX_PATH_BYTES) {
    return null;
  }
  let path: string;
  try {
    path = new TextDecoder('utf-8', { fatal: true }).decode(rawPath);
  } catch {
    return null;
  }
  if (path.length === 0 || path.includes('\0')) return null;
  if (invocation.line !== undefined || invocation.endLine !== undefined) {
    if (invocation.findBase64 !== undefined) return null;
    const line = invocation.line;
    if (
      typeof line !== 'number' ||
      !Number.isInteger(line) ||
      line < 1 ||
      line > 10_000_000
    ) {
      return null;
    }
    const endLine = invocation.endLine;
    if (endLine !== undefined) {
      if (
        typeof endLine !== 'number' ||
        !Number.isInteger(endLine) ||
        endLine < line ||
        endLine > 10_000_000
      ) {
        return null;
      }
      return { path, line, endLine };
    }
    return { path, line };
  }
  if (invocation.findBase64 === undefined) return null;
  let rawFind: Buffer;
  try {
    rawFind = Buffer.from(invocation.findBase64, 'base64');
  } catch {
    return null;
  }
  if (rawFind.length === 0 || rawFind.length > 4096) return null;
  let find: string;
  try {
    find = new TextDecoder('utf-8', { fatal: true }).decode(rawFind);
  } catch {
    return null;
  }
  if (find.length === 0 || find.includes('\0')) return null;
  return { path, find };
}

/** The local rows, in project-list order: `machineId` absent or `local`. */
export function localOpenProjects(projects: Project[]): Project[] {
  return projects.filter(
    (one) => (one.machineId ?? LOCAL_MACHINE_ID) === LOCAL_MACHINE_ID
  );
}

/**
 * One candidate resolution: containment first, then the path door, in the
 * order §2.4 step 4 states. Answers the absolute path plus its project, or
 * the closed refusal word — never errno, detail, or the rejected path.
 */
export type AgentAccessResolveRefusal =
  | 'missing'
  | 'not-file'
  | 'outside-projects'
  | 'credential';

async function resolveInProject(
  project: Project,
  input: string
): Promise<
  | { ok: true; abs: string; rel: string; project: Project }
  | { ok: false; reason: AgentAccessResolveRefusal }
> {
  let realRoot: string;
  try {
    realRoot = await resolveProjectRoot(project.path);
  } catch {
    return { ok: false, reason: 'missing' };
  }
  // Relative inputs resolve only inside the caller's own project root
  // (the caller in `open.ts` never offers another project for one);
  // absolute inputs are tried against each local open project in order.
  let resolved: { abs: string; rel: string };
  try {
    resolved = await resolveInsideRoot(realRoot, input);
  } catch (err) {
    const word = fsPathRefusalOf(err);
    // The alias-root bound: a project opened through a link names the alias
    // itself, which refuses as `projectClosed` — there is no project beneath
    // the alias for the file to be outside of.
    if (word === 'projectClosed' || word === 'outside') {
      return { ok: false, reason: 'outside-projects' };
    }
    if (word === 'input') return { ok: false, reason: 'missing' };
    return { ok: false, reason: 'missing' };
  }
  const door = await answerPathDoor(resolved.abs, project.path);
  if (door.door === null && door.refusal === 'secret-name') {
    // The door's credential-name clause carries its own closed word: the
    // shipped NAME predicate refused, not a missing or malformed file.
    return { ok: false, reason: 'credential' };
  }
  if (door.door !== 'editor' || door.underBase === undefined) {
    // The door's own clauses decide missing/not-file; a leaf that escapes,
    // an executable, an image/PDF/Mac spelling, a bundle, a mount, a
    // directory and a missing row are all refused here.
    if (door.door === null && door.refusal === 'missing') {
      return { ok: false, reason: 'missing' };
    }
    return { ok: false, reason: 'not-file' };
  }
  return {
    ok: true,
    abs: resolved.abs,
    rel: door.underBase,
    project
  };
}

function projectViewOf(project: Project): AgentAccessProjectView {
  return { id: project.id, name: project.name, path: project.path };
}

/**
 * Convert a 1-based UTF-16 line/column offset to line/column. Lines are
 * 1-based, columns 0-based UTF-16, end exclusive.
 */
/**
 * The exclusive end column of one 1-based line: its own length plus one, so a
 * selection covers the line and the newline that ends it, as a mouse drag down
 * the gutter does. An empty line answers 1 for the same reason.
 */
function lineEndColumn(text: string, lineNumber: number): number {
  const lines = text.split('\n');
  const line = lines[lineNumber - 1] ?? '';
  return line.length + 1;
}

function offsetToPosition(
  text: string,
  offset: number
): { line: number; column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < offset; i += 1) {
    const unit = text.charCodeAt(i);
    if (unit === 0x0a) {
      line += 1;
      lineStart = i + 1;
    }
  }
  return { line, column: offset - lineStart };
}

function findFirstOccurrence(
  text: string,
  find: string
): { index: number; count: number } | null {
  let count = 0;
  let first = -1;
  let from = 0;
  for (;;) {
    const at = text.indexOf(find, from);
    if (at < 0) break;
    if (first < 0) first = at;
    count += 1;
    from = at + find.length;
  }
  if (first < 0) return null;
  return { index: first, count };
}

/**
 * Build the open operation over the deps. The dispatcher injects the result
 * as its `open` seam; it never sees anything but the closed value.
 */
export function buildAgentAccessOpen(
  deps: AgentAccessOpenDeps
): AgentAccessOpenHandler {
  return async (
    invocation: AgentAccessOpenInvocation
  ): Promise<AgentAccessOpenValue> => {
    const sessions = await deps.listSessions();
    const caller = sessions.find((one) => one.id === invocation.session);
    if (caller === undefined || caller.machine !== undefined) {
      throw new OpenUnavailableError();
    }
    const decoded = decodeLocator(invocation);
    if (decoded === null) {
      return refused('missing');
    }
    // The caller's OWN project only. An absolute path is required (the
    // dispatcher refuses a relative one as bad-request); a path inside any
    // other project, open or not, is `outside-projects`. No fallback.
    if (!decoded.path.startsWith('/')) return refused('outside-projects');
    const projects = localOpenProjects(await deps.listProjects());
    const callerProject =
      projects.find((one) => one.path === caller.projectPath) ?? null;
    if (callerProject === null) return refused('no-project');
    const resolved = await resolveInProject(callerProject, decoded.path);
    if (!resolved.ok) return refused(resolved.reason);
    const abs = resolved.abs;
    const project = resolved.project;
    // The strict shared bounded read. The gate's deterministic race arms
    // `afterFirstChunk` only when the armed harness checkpoint exists.
    // NOTE (Builder C2, recorded deviation): the checkpoint only NAMES the
    // arm; the pause plumbing arrives in the fix round. Today the harness
    // seam answers the same armed/unarmed question the gate drives, and
    // `afterFirstChunk` is driven in the strict reader's own suite.
    let text: string;
    void deps.harnessCheckpoint?.();
    try {
      const read = await readTextCapped(abs, 'strict', {
        afterFirstChunk: undefined
      });
      text = read.text;
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.includes('too large')) return refused('too-large');
      if (message.includes('binary')) return refused('not-text');
      if (message.includes('UTF-8')) return refused('not-text');
      if (message.includes('changed')) return refused('changed');
      if (message.includes('no longer')) return refused('missing');
      if (message.includes('not a regular file')) return refused('not-file');
      return refused('missing');
    }
    // The switch and the caller are re-checked immediately before the
    // renderer event. A switch that moved off in flight throws the
    // transport's `disabled` refusal (Builder C1's dispatch reports it as
    // `disabled`), and a gone/remote caller throws `unavailable` — both
    // send nothing. Thrown, not returned, so the dispatch `finally` still
    // attributes the outcome and the service's catch still answers a
    // closed error rather than an `ok: true` open value.
    if (!deps.isEnabled()) {
      throw new OpenDisabledError();
    }
    // PHASE 361. The caller that was live when the request arrived may be gone
    // by the time the file has been read. That is a REFUSAL this operation can
    // name (`renderer-unavailable` is wrong; the session is what moved), and a
    // thrown error here used to collapse into the service's generic
    // `unavailable`, which an agent cannot tell apart from "Tortie is not
    // running". Answer the closed word instead.
    const live = (await deps.listSessions()).find((one) => one.id === caller.id);
    if (live === undefined || live.machine !== undefined) {
      return refused('session-gone');
    }
    const lineCount = text.split('\n').length;
    if (decoded.line !== undefined) {
      const line = decoded.line;
      const endLine = decoded.endLine ?? line;
      if (line > lineCount || endLine > lineCount) {
        return refused('line-out-of-range');
      }
      // PHASE 362 (his filing: the highlight read dim beside a manual
      // selection). A line range ends at the END OF THE ACTUAL LINE plus one
      // column, so the selection covers the line and its break, exactly as a
      // mouse drag down the gutter does. `endColumn: 0` on the last line was
      // an EMPTY range: nothing was selected and the only thing a person saw
      // was the flash wash, which is why it read as dim rather than as a
      // selection.
      const selection = {
        line,
        column: 0,
        endLine,
        endColumn: lineEndColumn(text, endLine),
        highlight: true as const
      };
      return await deliverOpen(deps, {
        invocation,
        project,
        abs,
        rel: resolved.rel,
        selection
      });
    }
    if (decoded.find === undefined) return refused('missing');
    const found = findFirstOccurrence(text, decoded.find);
    if (found === null) return { state: 'not-found', matches: 0 };
    const start = offsetToPosition(text, found.index);
    const end = offsetToPosition(text, found.index + decoded.find.length);
    const selection = {
      line: start.line,
      column: start.column,
      endLine: end.line,
      endColumn: end.column,
      highlight: true as const
    };
    return await deliverOpen(
      deps,
      {
        invocation,
        project,
        abs,
        rel: resolved.rel,
        selection
      },
      found.count
    );
  };
}

interface DeliverInput {
  invocation: AgentAccessOpenInvocation;
  project: Project;
  abs: string;
  rel: string;
  selection: {
    line: number;
    column: number;
    endLine: number;
    endColumn: number;
    highlight: true;
  };
}

async function deliverOpen(
  deps: Pick<
    AgentAccessOpenDeps,
    'broker' | 'listSessions' | 'mainWindow' | 'windowFocused'
  >,
  input: DeliverInput,
  matches?: number
): Promise<AgentAccessOpenValue> {
  const target = chooseMainWindow(deps.mainWindow, input.project, input.rel);
  if (target === null || target.isDestroyed()) {
    return refused('renderer-unavailable');
  }
  // Never a show/focus/restore/moveTop/app.focus call: the focus answer is
  // read, never taken. Only an already-focused window opening the caller's
  // own project may land in the editor.
  const windowFocused = deps.windowFocused();
  // Focus only when the window was already focused AND the target is the
  // caller's project. Cross-project/background opens switch and open but
  // never steal a terminal's keyboard focus.
  const sessions = await deps.listSessions();
  const caller = sessions.find((one) => one.id === input.invocation.session);
  const isCallerProject =
    caller !== undefined && caller.projectPath === input.project.path;
  const focus = windowFocused && isCallerProject;
  // The request id is minted by the broker, which is also what accepts the
  // completion for it: one owner for the id and the wait.
  const requestId = deps.broker.mintRequestId();
  const payload: AgentAccessRendererOpen = {
    requestId,
    path: input.abs,
    relPath: input.rel,
    repoPath: input.project.path,
    projectId: input.project.id,
    request: {
      repoPath: input.project.path,
      relPath: input.rel,
      path: input.abs,
      mode: 'file',
      source: 'quickopen',
      preview: false,
      selection: {
        line: input.selection.line,
        column: input.selection.column,
        endLine: input.selection.endLine,
        endColumn: input.selection.endColumn,
        highlight: true
      }
    },
    focus
  };
  // Deliver through the broker: the one `sendEvent` for this feature and
  // the one wait for the renderer's typed completion. A timeout, a
  // destroyed renderer, a wrong sender, or a non-accepted outcome all read
  // `renderer-unavailable`. Nothing here echoes a reason.
  const completion = await deliverAgentAccessOpen(
    deps.broker,
    target,
    payload
  );
  if (completion === null || completion.outcome !== 'accepted') {
    return refused('renderer-unavailable');
  }
  return {
    state: 'opened',
    project: projectViewOf(input.project),
    path: input.abs,
    selection: input.selection,
    ...(matches === undefined
      ? {}
      : { matches, chosen: 1 as const })
  };
}
