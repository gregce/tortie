/**
 * The local create — ⌘T, from the name a person typed to the row and the
 * pane.
 *
 * Phase 125 moved this out of `./core.ts` unchanged. It was the single largest
 * method in the codebase at 520 lines, and it touched 8 of the class's 33
 * fields, which is the whole of {@link CreateLocalDeps}. Every comment moved
 * with its code, every `faultPoint` kept its name because `npm run smoke:fault`
 * drives them by name, and the order of the statements is the order it had at
 * `8ce91a0`.
 *
 * TWO POSITIONS IN THIS FILE ARE LOAD BEARING AND A LATER ROUND MUST NOT MOVE
 * THEM. The machine decision is the first statement of the function, so that a
 * create path added later cannot be composed above it. The capture refusal
 * read is the second, above the remote branch, for the same reason. Both are
 * read as text by `__tests__/p94-remote-create-folder.test.ts` and
 * `__tests__/capture-refusal-wiring.test.ts`, which count the call sites, so
 * neither name is written again anywhere in this header.
 *
 * THE ONE RULE THIS FILE KEEPS. It imports nothing from `./core`. The core
 * builds one dependency object in its constructor and passes it in.
 */

import { randomUUID } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { realpath } from 'node:fs/promises';
import { EVT_CAPTURE_NOTICE } from '@shared/ipc';
import type {
  CreateSessionInput,
  LaunchableAgentKind,
  Session
} from '@shared/types';
import {
  ensureClaudeHookSettings,
  GmuxHookServer,
  withClaudeSettingsFlag
} from '../activity';
import {
  // PHASE 48. The structural preflight. It reads the first line of the file
  // the resolve just found and asks whether the interpreter that line names
  // is on the PATH the pane will get. It spawns nothing.
  checkAgentBinary,
  expandDirs
} from '../agents';
// PHASE 23. One lookup, into the merged agent table, in memory. It is used to
// find a configured agent's binary NAME when the compiled registry has never
// heard of the id. It grants nothing: the confirm gate lives in
// src/main/manifest/agents.ts and is asked on the same create path.
import { agentEntry, launchableAgentEntry } from '../config/store';
import { gmuxError } from '../errors';
// Named crash points for the fault harness. A no-op on every launch that is
// not a harness launch — see fault/inject.ts.
import { faultPoint } from '../fault/inject';
import { getLog } from '../log';
import {
  ManifestStore,
  resolveLaunchSpec,
  toSession,
  type HarvestContext,
  type ManifestSessionRecord
} from '../manifest';
// PHASE 90.3 and PHASE 91. The two machine reads this path makes. Direct
// imports rather than through `../machines`, so this file's graph gains the
// exec plane and not the visible connection test.
import { remoteCreate } from '../machines/remote-sessions';
// The one channel main uses to say a durability layer is degraded, and the
// owner of the once-per-run latch (Phase 19 item 9).
import { postDurabilityNotice } from '../notice';
// Phase 22 (research 29 §8.2). ADVISORY, and the import is one function that
// returns void so that nothing on either launch path can await it, fail on it
// or branch on it. See the module header for the four rules.
import { recordLaunchContext } from '../context/snapshot';
import {
  captureRefusedOnMachine,
  wrapForCapture,
  wrapWithRecord,
  type SpecstoryCaptureRecord
} from '../specstory';
import * as tmux from '../tmux';
// Phase 16 (G1, event half): the one "send to every live window" loop, in
// ../typed-events. Same channels, same payloads, same isDestroyed() guard.
import { broadcastEvent } from '../typed-events';
// LEAF import: the ../projects barrel re-exports the clone spawner and the
// folder creator, and the remote tab upsert below needs one pure name rule.
import { projectNameForPath } from '../projects/name';
import type { IdCaptureOptions } from './id-harvest';
import {
  agentNotFoundMessage,
  bareNameFor,
  binaryCandidatesOf,
  createMachineIdFor,
  interpreterMissingMessage,
  newSessionRecord,
  paneEnvFor,
  remoteCreateFolders,
  spawnArgvFor
} from './launch-plan';
import { LOCAL_MACHINE } from './reconcile-plan';

/**
 * Scope "sessions" (Phase 35), the same scope `./core.ts` writes under, so a
 * line this path writes reads exactly as it did before Phase 125 moved it.
 */
const sessionsLog = getLog('sessions');

/** Every event goes to every window. See ../typed-events. */
const broadcast = broadcastEvent;

/**
 * Does this path name a folder that exists?
 *
 * It lives here because the create path is two of its three readers. The third
 * is `addProject` in `./core.ts`, which imports it from this file rather than
 * keeping a second copy.
 */
export function isDirectory(path: string): boolean {
  try {
    return existsSync(path) && statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * What the local create needs from the session core.
 *
 * These 8 members are the complete measured set: the body makes 16 `this`
 * references in 520 lines and they resolve to exactly these names. The three
 * maps are the core's own objects, handed over by reference rather than
 * copied, so the core and this path read and write the same entries.
 */
export interface CreateLocalDeps {
  readonly manifest: ManifestStore;
  /** Loopback channel for injected agent hooks (claude only). */
  readonly hookServer: GmuxHookServer;
  /** manifest session id → live tmux `$-id`. */
  readonly liveIds: Map<string, string>;
  /** live tmux `$-id` → manifest session id. */
  readonly byTmuxId: Map<string, string>;
  /** Session id → the instant its create started. See core's own field. */
  readonly createsInFlight: Map<string, number>;
  /** Push the full session list to every window. */
  broadcastSessions(): void;
  /** Arm the conversation id watch. See ./id-harvest.ts. */
  startIdCapture(
    id: string,
    agent: LaunchableAgentKind,
    ctx: HarvestContext,
    extraArgs: readonly string[],
    options?: IdCaptureOptions
  ): void;
  /** The installed version of `agent`, or null. See ./id-harvest.ts. */
  cachedAgentVersion(agent: LaunchableAgentKind): string | null;
}

export async function createLocalSession(
  input: CreateSessionInput,
  deps: CreateLocalDeps
): Promise<Session> {
  if (input.name.trim().length === 0) {
    throw gmuxError('INVALID_INPUT', 'Session name cannot be empty.');
  }
  // PHASE 94, ITEM 2. WHICH MACHINE THIS CREATE RUNS ON, DECIDED ONCE, HERE.
  //
  // It is the FIRST statement of the method, above the capture refusal read
  // below, for the reason that read gives for its own position: a create path
  // added later must not be composable above it. Every read of the machine
  // inside this method is this value, and `input.machineId` is not read again.
  //
  // The defect it removes is the create the agent board and the per-agent
  // hotkeys use. It sends no machine at all, so a hotkey pressed inside a tab
  // whose files are on another computer started a process on THIS Mac, at a
  // path only that computer has. See createMachineIdFor in ./launch-plan for
  // the rule and for why it can take nothing away.
  const machineId = createMachineIdFor(input);
  // PHASE 91. The one place this product decides that a session on another
  // machine is not captured. It is READ HERE, above the remote branch, so
  // that it covers the branch below AND the wrap further down, and so that a
  // create path added later cannot be composed above it.
  //
  // The operator dropped remote capture on 2026-08-19. His words were that
  // it must flow through, so that a person cannot inadvertently start a
  // remote session under capture from Cmd+T. Four renderer surfaces compose
  // a create and a fifth will be added. A guard living in four of them is a
  // guard the fifth misses, which is how the split leaf Restart defect
  // happened and how Phase 84 fixed it.
  const captureRefused = captureRefusedOnMachine(input.agent, machineId);
  // PHASE 70. A create on another machine leaves this method here, before any
  // local check runs. Every check below asks about this Mac: whether a folder
  // exists here, which binary is here, what this Mac's login shell PATH holds.
  // None of them can answer for a different computer, and running them anyway
  // is how a create would refuse a folder that is perfectly there.
  if (machineId !== undefined) {
    // PHASE 90.3, AS PHASE 94 LEFT IT. Both folders sent to that machine are
    // folders ON THAT MACHINE, and one function decides them both. The whole
    // rule, every case it answers and the Phase 84 item 5 trace live on
    // `remoteCreateFolders` in ./launch-plan. Two things are worth having in
    // front of a reader of this call.
    //
    // `projectPath` may be the empty string, which records that Tortie sent
    // no folder and leaves the machine's own list to report what its server
    // chose, which is what the re-home reads.
    //
    // THE `cwd` KEY IS ABSENT rather than empty when no folder is to be sent.
    // Phase 84 item 5 is that absence. It is NOT `?? input.projectPath`: that
    // path is this Mac's project folder and it names nothing on the other
    // computer, so an empty Directory field used to start the session in a
    // folder named after a project that is not there. That fallback is not
    // restored here, and `remoteCreateFolders` never reads a path belonging
    // to this Mac.
    const folders = remoteCreateFolders({
      machineId,
      ...(input.projectMachineId !== undefined
        ? { projectMachineId: input.projectMachineId }
        : {}),
      projectPath: input.projectPath,
      ...(input.cwd !== undefined ? { cwd: input.cwd } : {})
    });
    const farProjectPath = folders.projectPath;
    const session = await remoteCreate({
      machineId,
      name: input.name,
      projectPath: farProjectPath,
      ...(folders.cwd !== undefined ? { cwd: folders.cwd } : {}),
      agent: input.agent,
      ...(input.extraArgs !== undefined ? { extraArgs: input.extraArgs } : {})
    });
    // PHASE 91. The session exists on that machine and it is not captured.
    // Said now, next to the session it is about, because the alternative is
    // a person finding an empty .specstory/history days later. This is the
    // same notice a local declined capture raises, so the toast, the log and
    // the contract are the ones Phase 15 already shipped.
    //
    // The session is NOT refused. A refused capture has never been fatal in
    // this product and it does not become fatal here. The person gets the
    // session they asked for, without capture, and one sentence saying so.
    if (input.capture === true && captureRefused !== null) {
      sessionsLog.warn(`${captureRefused} (session "${input.name}")`);
      broadcast(EVT_CAPTURE_NOTICE, {
        kind: 'declined',
        sessionId: session.id,
        sessionName: input.name,
        message: captureRefused
      });
    }
    // PHASE 90.3. The folder over there becomes a tab, so the session lands
    // somewhere a person can see it and every sidebar in that tab reads the
    // machine the session is on. It is upserted rather than checked: the
    // create just proved the folder is usable on that machine, so asking again
    // would be a second round trip for an answer already in hand.
    //
    // Nothing is sent to the machine by this line.
    if (farProjectPath.startsWith('/')) {
      try {
        deps.manifest.upsertRemoteProject({
          machineId,
          path: farProjectPath,
          name: projectNameForPath(farProjectPath)
        });
      } catch (err) {
        // A tab that could not be recorded is not a reason to fail a session
        // that is already running over there. The next completed list re-homes
        // it, because the same folder comes back on every pass.
        sessionsLog.warn(
          `the session started on ${machineId} and its folder could ` +
            `not be opened as a tab: ${(err as Error).message}`
        );
      }
    }
    deps.broadcastSessions();
    return session;
  }
  // PHASE 81. The one wait a create still has. Every read below and the
  // pane's own execvp must see the same PATH, and this is the line that
  // guarantees they do. It is after the remote branch on purpose: a session
  // on another machine takes that machine's PATH, and this Mac's capture
  // answers nothing about it. See src/main/tmux/user-path.ts.
  await tmux.installUserPath();
  if (!isDirectory(input.projectPath)) {
    throw gmuxError(
      'PROJECT_NOT_FOUND',
      'The project folder for this session does not exist.',
      input.projectPath
    );
  }
  const cwd = input.cwd ?? input.projectPath;
  if (!isDirectory(cwd)) {
    throw gmuxError(
      'INVALID_INPUT',
      'The working directory for this session does not exist.',
      cwd
    );
  }

  // Bug A (Phase 9.2): resolve the agent binary to an ABSOLUTE path against
  // the captured login-shell PATH + known install dirs BEFORE anything is
  // written or spawned. Not found → typed error → friendly modal message —
  // never a dead pane. The manifest then stores only absolute paths (argv
  // AND resume_argv), so restores survive PATH drift too.
  let binPath: string | undefined;
  let bareName: string | undefined;
  // PHASE 23 FIX ROUND. Where to LOOK for the binary, which is as load
  // bearing as its name and is on the confirm sheet as "Looks for it in".
  // Declared out here because two readers need it: the resolve below, and
  // the bare-name decision after the health check. (Phase 49 corrected
  // this comment. It used to say the pane env at the spawn also read it;
  // nothing on the spawn path has read it since the Phase 48 rework.)
  let probeDirs: string[] = [];
  if (input.agent !== 'shell') {
    // Phase 10 (settings+hotkeys stream): the binary name comes from the
    // agent REGISTRY, not the agent id — cursor's binary is `cursor-agent`,
    // antigravity's is `agy`. See binaryCandidatesOf in ./launch-plan for
    // the Phase 25.5 whole-list rule and the merged-table sourcing. The
    // confirm gate is still asked below, inside resolveLaunchSpec — a name
    // is not a permission.
    probeDirs = expandDirs(agentEntry(input.agent)?.extraProbeDirs ?? []);
    const candidates = binaryCandidatesOf(
      input.agent,
      launchableAgentEntry(input.agent)
    );
    let abs: string | null = null;
    let bare: string = candidates[0] ?? input.agent;
    for (const candidate of candidates) {
      const hit = await tmux.resolveBinary(candidate, probeDirs);
      if (hit !== null) {
        abs = hit;
        bare = candidate;
        break;
      }
    }
    if (abs === null) {
      throw gmuxError(
        'AGENT_NOT_FOUND',
        agentNotFoundMessage(candidates),
        candidates[0] ?? input.agent
      );
    }
    binPath = abs;
    // PHASE 48. The structural preflight (../agents/health). It opens the
    // resolved file, reads its first line if it has a shebang, and asks
    // whether the interpreter that line names resolves against the same
    // PATH this pane will get. It never spawns anything and it never runs
    // the agent. `interpreter-missing` is the only answer that stops a
    // launch, and `Start it anyway` sends the same argv back with the check
    // skipped, because the check can be wrong about a wrapper that re-execs
    // through something Tortie cannot see.
    if (input.startAnyway !== true) {
      const health = await checkAgentBinary(abs);
      if (health.answer === 'interpreter-missing') {
        sessionsLog.warn(
          `launch refused: ${bare} at ${abs} needs ${health.interpreter}, ` +
            `which is not on the PATH this pane would get ` +
            `(${health.elapsedMs} ms, shebang ${health.shebang})`
        );
        // `detail` is TWO LINES for this code. The first is the absolute
        // path, which is what every other AGENT_* code puts there. The
        // second is the interpreter's name, because the create sheet's two
        // ways forward have to name the program the person is being asked
        // to install or to reveal, and a renderer must never read a fact
        // out of a prose sentence. See readInterpreterDetail in
        // src/renderer/app/CreateSessionModal.tsx.
        throw gmuxError(
          'AGENT_INTERPRETER_MISSING',
          interpreterMissingMessage(health.binPath, health.interpreter),
          `${health.binPath}\n${health.interpreter}`
        );
      }
    }
    // PHASE 23 FIX ROUND, the second half of the `extraProbeDirs` fix, and
    // this is the half a driver run found rather than a reading.
    //
    // The pane is spawned by BARE NAME (F3 above). tmux resolves that name
    // against the PATH of the tmux CLIENT that asked for the session, which
    // is this process, and it ignores the per-pane `-e PATH=` entirely.
    // Phase 48 corrected this comment. It used to name the SERVER
    // environment, and that reading was measured wrong twice,
    // independently, on tmux 3.6a. What WAS measured: the same session
    // created with an absolute argv[0] runs, and created with the bare name
    // plus `-e PATH=<dir>` dies at once with "Pane is dead (status 1)". The
    // client's PATH is set at the one assignment in
    // src/main/tmux/user-path.ts, which `createSession` awaits above
    // (Phase 81 moved the line; it used to sit in supervisor.ts
    // ensureServer). See docs/research/47-agent-installs.md section 2.
    //
    // So an agent whose binary exists ONLY in a directory its own entry names
    // cannot be launched by its bare name at all. Detection found it, the
    // resolve above found it, the manifest recorded the absolute path, and
    // the pane still died. For exactly that case, and nothing else, argv[0]
    // stays absolute.
    //
    // It costs F3 nothing, and the reason is F3's own. F3 protects an agent a
    // user might end with `pkill -f "$(command -v claude)"`, and `command -v`
    // reads the same login-shell PATH the tmux server was given. A binary
    // that PATH cannot find is one that command substitution cannot name
    // either, so there is no pattern for that pkill to match and nothing for
    // the bare name to protect.
    // PHASE 49, research 47 §9 and §11. The decision itself lives in
    // ./launch-plan (bareNameFor): the bare name is used only when it is
    // really a bare name AND the file the pane's PATH would pick is
    // byte-for-byte the file the manifest records. The old code tested
    // `onLoginPath` for null where it must compare it with `abs`, and it
    // passed a path-shaped Phase 23 override to tmux as argv[0], where no
    // tilde is expanded and the pane died. The shortcut below is the same
    // one as before, now refused for a path-shaped candidate so the rule
    // in bareNameFor sees it.
    const onLoginPath =
      probeDirs.length === 0 && !bare.includes('/')
        ? abs
        : await tmux.resolveBinary(bare);
    bareName = bareNameFor(bare, abs, onLoginPath);
  }

  const id = randomUUID();
  // resolveLaunchSpec (not buildLaunchSpec): cursor's id comes from a side
  // command that has to run BEFORE the pane exists.
  const spec = await resolveLaunchSpec(
    input.agent,
    input.extraArgs ?? [],
    binPath
  );
  // Phase 13: claude's deterministic hook channel. Purely a latency
  // upgrade over its pid file, so a failure to write the settings file
  // just means no flag — never a failed create (and never a `claude
  // --settings <missing>` that would refuse to start).
  if (input.agent === 'claude') {
    // Phase 182 passes the working directory too, and for ONE read: whether
    // the person's own `.claude/settings.json` in this project already names
    // a status line, in which case Tortie installs none of its own.
    const settingsPath = ensureClaudeHookSettings(deps.hookServer, id, cwd);
    if (settingsPath !== null) {
      spec.argv = withClaudeSettingsFlag(spec.argv, settingsPath);
      if (spec.resumeArgv !== undefined) {
        spec.resumeArgv = withClaudeSettingsFlag(spec.resumeArgv, settingsPath);
      }
    }
  }
  // Phase 15 — SpecStory capture. The wrap is applied to BOTH argvs and to
  // nothing else: `spec.argv` becomes `specstory run <provider> … -c "<the
  // same argv>"`, and an already-armed `resumeArgv` gets the identical
  // treatment, so a pre-assigned session (claude/gemini/pi) is armed
  // WRAPPED from the moment the row is written and a restore keeps
  // capturing without anyone having to remember to re-wrap it.
  //
  // A decline is never fatal and never silent: the session launches bare
  // and the sentence reaches the user (toast) and the log.
  let capture: SpecstoryCaptureRecord | undefined;
  let captureDeclined: string | null = null;
  // PHASE 91. The second term is the SAME answer read at the top of this
  // method, above the remote branch. Read here as well, so that an edit
  // which moves or removes that branch still cannot compose a wrap for a
  // session that runs on another machine.
  if (
    input.capture === true &&
    captureRefused === null &&
    input.agent !== 'shell'
  ) {
    const wrapped = await wrapForCapture(input.agent, spec.argv);
    if (wrapped.argv !== null && wrapped.record !== null) {
      capture = wrapped.record;
      spec.argv = wrapped.argv;
      if (spec.resumeArgv !== undefined) {
        const resumeWrapped = wrapWithRecord(wrapped.record, spec.resumeArgv);
        if (resumeWrapped !== null) spec.resumeArgv = resumeWrapped;
      }
    } else {
      captureDeclined = wrapped.declined;
    }
  }

  // PHASE 21 (A8 + G6) — record the contract, not a pointer to the registry.
  //
  // Restore used to ask the LIVE registry whether this agent's resume needs
  // its original directory, and the registry answers for the agent Tortie
  // launches today. For an id it no longer launches the answer was `false`,
  // and for a pi shaped agent `false` means restore opens an empty session
  // that looks resumed. Everything restore reads for correctness is written
  // here instead, while it is still true.
  //
  // Two awaits, neither of which spawns anything: the two realpath calls
  // are one fs lookup each. The version read is SYNCHRONOUS since Phase 49
  // (peekDetectedAgents never starts a scan and never waits on one), so a
  // create can never stall behind a version probe. The resolved cwd is
  // recorded because it is the store key for five of the eleven agents, so
  // a moved or re-cloned checkout is the difference between finding the
  // conversation and not.
  const agentVersion = deps.cachedAgentVersion(input.agent);
  const cwdReal = await realpath(cwd).catch(() => cwd);
  const projectReal = await realpath(input.projectPath).catch(
    () => input.projectPath
  );

  const now = Date.now();
  // The whole row is composed in ./launch-plan (Phase 42 stage 5): every
  // field restore depends on is decided there, while it is still true
  // (Phase 21, A8 + G6), and the composition has a direct unit test. The
  // predicted tmuxName is replaced below with the name tmux actually
  // applied (dedupe may append “-2”).
  const record: ManifestSessionRecord = {
    ...newSessionRecord({
      id,
      input,
      cwd,
      spec,
      capture,
      agentVersion,
      binPath,
      cwdReal,
      projectReal,
      now
    }),
    // PHASE 71, migration 013. Where a session runs is decided once, at
    // create, and stated on the row rather than assumed by every later
    // reader. This method is the local create, so the answer is this Mac. A
    // session on another machine takes a different path entirely and gets no
    // manifest row at all in this release, which is what the refusal in
    // ../manifest/sessions-repository.ts holds true.
    machineId: LOCAL_MACHINE
  };

  // §2.4 Step 0: durability record exists BEFORE the process does — which
  // is exactly the window a concurrent reconcile must not judge (16.5.1).
  // Held until the row is bound to a live tmux id below.
  deps.createsInFlight.set(id, now);
  faultPoint('create.before-declaration');
  deps.manifest.insertSession(record);
  faultPoint('create.after-declaration');

  // F3 (Phase 12.7, research 21 §8) — LAUNCH BY BARE NAME. See
  // spawnArgvFor in ./launch-plan for the whole rule: why the manifest
  // keeps the absolute path while the spawn uses the bare name, and how a
  // captured session gets the same protection one level in.
  const launchArgv = spawnArgvFor(spec.argv, bareName, capture);

  // PHASE 33. The variables this row asks Tortie to read from the login
  // shell. One probe, 3 second deadline, group killed, and nothing is
  // spawned at all when the row names none, which is every compiled agent.
  //
  // The resolved pairs live in this local and in the tmux `-e` set, and
  // nowhere else. They are deliberately NOT put on `spec.env`, because that
  // is written into the manifest row verbatim and replayed at restore, which
  // is how option B in research 41 put provider keys into SQLite in plain
  // text. Restore reads the NAMES off the row and probes again.
  let resolvedEnv: Record<string, string> = {};
  let envProbe: tmux.CaptureEnvResult | null = null;
  if (spec.envPassthrough !== undefined && spec.envPassthrough.length > 0) {
    envProbe = await tmux.captureLoginShellEnv(spec.envPassthrough);
    resolvedEnv = envProbe.values;
  }

  let info: tmux.TmuxSessionInfo;
  try {
    info = await tmux.createSession({
      displayName: input.name,
      cwd,
      argv: launchArgv,
      env: paneEnvFor(spec.env, resolvedEnv, id)
    });
  } catch (err) {
    // Spawn never happened — a lingering row would resurrect a session
    // the user never got.
    deps.createsInFlight.delete(id);
    deps.manifest.deleteSession(id);
    throw err;
  }

  faultPoint('create.after-spawn');

  deps.liveIds.set(id, info.sessionId);
  deps.byTmuxId.set(info.sessionId, id);
  deps.createsInFlight.delete(id);
  // tmux may have deduped the name ("foo-2"), and `new-session -P -F`
  // hands back the pane pid — the F2 forensic anchor, recorded once here
  // because tmux forgets it the moment the dead pane is reaped.
  if (info.tmuxName !== record.tmuxName || info.panePid !== undefined) {
    deps.manifest.updateSession(id, {
      ...(info.tmuxName !== record.tmuxName
        ? { tmuxName: info.tmuxName }
        : {}),
      ...(info.panePid !== undefined ? { panePid: info.panePid } : {})
    });
  }

  faultPoint('create.after-launch-record');

  // PHASE 33. The pane is running and it is bound to its live tmux id, so
  // the notice can name a session that exists. It says one thing: this pane
  // started without a variable its row promises. Nothing else on the machine
  // would ever say so, and the agent inside it fails much later with a
  // message about its provider rather than about the shell.
  if (envProbe !== null && (envProbe.missing.length > 0 || envProbe.probeFailed)) {
    postDurabilityNotice({
      kind: 'env-unresolved',
      sessionId: id,
      sessionName: input.name,
      names: envProbe.missing,
      probeFailed: envProbe.probeFailed
    });
  }

  // Mirror metadata into tmux user options so the durable server is
  // self-describing even if the manifest is lost (§2.4 Step 0.2).
  // Best-effort: a failed mirror must not fail the create.
  try {
    await tmux.setSessionOption(info.sessionId, '@gmux-id', id);
    faultPoint('create.after-identity-stamp');
    await tmux.setSessionOption(info.sessionId, '@gmux-agent', input.agent);
    if (spec.agentSessionId !== undefined) {
      await tmux.setSessionOption(
        info.sessionId,
        '@gmux-session-id',
        spec.agentSessionId
      );
    }
  } catch (err) {
    sessionsLog.warn(
      `could not mirror metadata into tmux options: ${(err as Error).message}`
    );
  }

  // Agents with no pre-assignment (codex, muse, qwen, deepseek,
  // antigravity): read the id back out of their store after spawn and
  // record the armed resume argv. The pane pid and tmux session id are the
  // correlation keys — qwen writes a descendant pid, muse writes the pane.
  if (spec.idCapture === 'store-harvest') {
    deps.startIdCapture(
      id,
      input.agent,
      {
        // `cwdReal`, not `cwd`. The row keeps the folder the user chose and
        // the harvest needs the folder itself: pi and qwen build their
        // store directory from it, and every ownership rule in
        // ./claim-strength.ts compares it as a string. Two panes in one
        // physical folder can spell it two ways, e.g. /tmp and /private/tmp.
        cwd: cwdReal,
        sinceTs: now,
        tmuxSessionId: info.sessionId,
        ...(info.panePid !== undefined ? { panePid: info.panePid } : {})
      },
      input.extraArgs ?? [],
      { atCreate: true }
    );
  }

  // A capture the user asked for and did not get is said NOW, next to the
  // session it is about — the alternative is discovering an empty
  // .specstory/history days later and blaming SpecStory for it.
  if (captureDeclined !== null) {
    sessionsLog.warn(`${captureDeclined} (session "${input.name}")`);
    broadcast(EVT_CAPTURE_NOTICE, {
      kind: 'declined',
      sessionId: id,
      sessionName: input.name,
      message: captureDeclined
    });
  }

  // Phase 22 (research 29 §8.2): record what this agent's configuration was
  // at this moment, so that "why did that agent not use the skill I just
  // wrote" has an answer later. No agent writes this down for itself, and
  // Tortie owns the launch, so this is the only place it can be recorded.
  //
  // NOT AWAITED, AND THAT IS THE DESIGN RATHER THAN AN OMISSION. It returns
  // void so nobody can await it. The scan walks configuration directories,
  // which is about 15 ms warm and was measured at 7.1 s on a cold page cache
  // for the equivalent walk, and a launch must never wait on either. It is
  // last in this method for the same reason: every durability-critical
  // effect above it has already happened, so nothing it does or fails to do
  // can reach them.
  recordLaunchContext(deps.manifest, {
    sessionId: id,
    reason: 'create',
    agent: input.agent,
    cwd: cwdReal
  });

  deps.broadcastSessions();
  const stored = deps.manifest.getSession(id);
  return toSession(stored ?? record);
}
