/**
 * S6 — New session modal (⌘T). w:480, top 20vh, scrim; Enter creates from
 * any field and from the agent board; Esc cancels. Total happy path:
 * ⌘T ↩ = two keys.
 *
 * Phase 10 (create-modal stream): the 3-option segmented control became a
 * grid over EVERY launchable registry agent (agents:list-driven when the
 * bridge has it, static registry mirror otherwise) + Shell last. The selected
 * agent's launch-flag presets render as Options toggles (danger-styled per
 * DESIGN-SPEC S6, pre-seeded from Settings launch defaults) whose tokens ride
 * CreateSessionInput.extraArgs into BOTH argv and resume_argv.
 *
 * Phase 15 replaced the disabled capture placeholder with the real thing: one
 * checkbox that runs the agent under SpecStory, drawn only when this machine
 * can honour it, remembered per agent, and captioned with where the transcript
 * actually goes.
 *
 * Phase 12.12 item 1: the picker itself is no longer written here. It is the
 * SHARED AgentGrid (./AgentGrid.tsx) — the same board §6.2's empty state
 * shows, in select mode. What this sheet keeps is what only it has: the name
 * field, the directory picker, the flag presets, and the one recovery the
 * empty state does not offer — a copyable install command for a missing CLI.
 * Per-agent status ("not installed", "early") is on the tiles now, so the row
 * under the grid stopped being a caption about whichever agent the pointer
 * touched last and became purely that recovery.
 *
 * PHASE 84 adds two things to the machine half of this sheet, and keeps one
 * thing exactly as it was.
 *
 *  - A machine Tortie has not signed in to in this run stays in the list and
 *    is drawn off with the reason in its own text, instead of being offered
 *    and then refused after a person has typed a name.
 *  - A machine gets a folder picker of its own, drawn by Tortie, because the
 *    panel macOS ships walks THIS Mac's disk and a folder chosen in it names
 *    nothing over there.
 *  - The sheet still resets to This Mac on every opening. The operator decided
 *    on 2026-08-18 that the last machine is NOT remembered per project, so one
 *    Cmd-T and one Return can never start a process on another computer.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AgentGrid } from './AgentGrid';
import type { LaunchableAgentKind } from '@shared/types';
import type { MachineRowView } from '@shared/ipc';
import {
  CREATE_DIR_EMPTY_HINT,
  CREATE_DIR_HINT,
  CREATE_HONESTY_LINES,
  createDirLabel,
  createDirPlaceholder,
  DIR_PICKER_OPEN,
  MACHINE_FIELD_LABEL,
  MACHINE_NOT_SIGNED_IN_HINT,
  machineNotSignedInOption,
  THIS_MAC
} from './machine-copy';
import { RemoteDirPicker } from './RemoteDirPicker';
import {
  captureDefaultFor,
  presetArgvTokens,
  type AgentFlagCatalogView,
  type AgentFlagPresetView,
  type GmuxSettings
} from '@shared/settings';
import {
  agentBlockedReason,
  agentShortLabel,
  buildAgentOptions,
  defaultAgentChoice,
  INSTALL_NOTE_LINE,
  installReadIsStale,
  installSourceSentence,
  noInstallCommandLine,
  resetAgentAvailabilityCache,
  STALE_INSTALL_LINE,
  useAgentAvailability,
  type AgentInstallDisplay,
  type AgentPickerOption
} from '../state/agents';
import { useSettingsStore } from '../settings/settings-store';
import { captureAvailableFor, useSpecStoryStatus } from '../state/specstory';
import { errorPayload, errorText, nextOrdinal, useApp } from '../state/store';
import { modalKeyDown } from './focus-trap';
import { Codicon } from '../icons';
import './create-session-modal.css';

// ---------------------------------------------------------------------------
// PHASE 84, item 8. A machine that is in the list and cannot hold a session
// ---------------------------------------------------------------------------

/**
 * True when at least one machine in the list cannot hold a session yet.
 *
 * `ready` is main's answer to exactly the condition a remote create tests. It
 * is optional on the row and absent reads as false, which is what a row
 * composed before the field existed knew about itself.
 */
export function anyMachineNotReady(rows: readonly MachineRowView[]): boolean {
  return rows.some((row) => row.ready !== true);
}

/**
 * The machine options, drawn.
 *
 * A machine Tortie has not signed in to in this run stays in the list and is
 * drawn off, with the reason in its own text. It used to be offered like any
 * other, and a person picked it, typed a name, pressed Create and read a
 * refusal that sent them back to the screen they had just come from. Removing
 * the option instead would fix the refusal by teaching nothing, which is the
 * rule the saved output item and the review item already follow.
 *
 * Exported so the option text and the disabled state are read in a test. The
 * environment there is node, so the test reads static markup.
 */
export function MachineOptions({
  rows
}: {
  rows: readonly MachineRowView[];
}): React.JSX.Element {
  return (
    <>
      {rows.map((row) => (
        <option key={row.id} value={row.id} disabled={row.ready !== true}>
          {row.ready === true ? row.label : machineNotSignedInOption(row.label)}
        </option>
      ))}
    </>
  );
}

/**
 * Two DIFFERENT presets sharing the same leading token are alternative
 * values of one value-taking flag (--sandbox workspace-write vs
 * danger-full-access): checking one must uncheck the other, or the argv
 * carries contradictions.
 */
function presetsConflict(
  a: AgentFlagPresetView,
  b: AgentFlagPresetView
): boolean {
  if (a.flag === b.flag) return false;
  return a.flag.split(' ')[0] === b.flag.split(' ')[0];
}

// ---------------------------------------------------------------------------
// PHASE 48 — the two states a create can land in, drawn in full
// ---------------------------------------------------------------------------

/**
 * State A. Nothing named like this agent exists anywhere Tortie looked.
 *
 * `message` is main's own sentence, which names every candidate binary that
 * was tried. It is drawn verbatim; the renderer adds the heading and the one
 * action.
 */
interface AgentAbsent {
  agentId: string;
  message: string;
}

/**
 * State B. The file exists, it is a script, and the interpreter its first
 * line names is not on the PATH the pane would get.
 *
 * WHERE THE TWO FIELDS COME FROM. `AGENT_INTERPRETER_MISSING` carries its
 * `detail` as two lines. The first is the absolute path of the file, which is
 * what every other AGENT_* code puts there. The second is the interpreter's
 * name, and it is there because the two ways forward have to name the program
 * the person is being asked to install or reveal, and a renderer must never
 * read a fact out of a prose sentence.
 */
export interface InterpreterMissing {
  binPath: string;
  interpreter: string;
  message: string;
}

/** Read the two lines described above. Returns null for anything else. */
function readInterpreterDetail(
  detail: string | undefined,
  message: string
): InterpreterMissing | null {
  const [binPath, interpreter] = (detail ?? '').split('\n');
  if (binPath === undefined || binPath.length === 0) return null;
  if (interpreter === undefined || interpreter.length === 0) return null;
  return { binPath, interpreter, message };
}

/** The last segment of an absolute path, e.g. "claude". */
function binName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * PHASE 49. The source line under a shown install command: where the command
 * was read from and when, with an anchor that opens the provider's page in
 * the browser (trusted-window denies the navigation and hands the https URL
 * to the system). When the read date is more than 180 days old, one more
 * line says so, so the user is never holding a stale string with no way to
 * tell. Exported pure so the unit tests can pin the 179/181 day boundary.
 */
export function InstallSourceLines({
  install,
  nowMs = Date.now()
}: {
  install: AgentInstallDisplay;
  nowMs?: number;
}): React.JSX.Element {
  return (
    <>
      <p className="launch-block-body">
        {installSourceSentence(install.readOn)}{' '}
        <a className="install-page-link" href={install.docUrl}>
          Open that page
        </a>
      </p>
      {installReadIsStale(install.readOn, nowMs) ? (
        <p className="launch-block-body">{STALE_INSTALL_LINE}</p>
      ) : null}
    </>
  );
}

/**
 * PHASE 49. State B's two ways forward. Way 1 branches on what the provider
 * itself recommends: when the canonical route exists and is NOT a package
 * manager, it names that route and hands the command over, because that
 * version does not go through the interpreter that just failed. When the
 * canonical route IS a package manager (gemini), the Phase 48 sentence
 * stays, because recommending the canonical npm route would hand the person
 * the shape that just failed. Exported pure so the branch is unit-testable.
 */
export function BlockedWays({
  blocked,
  label,
  install,
  nowMs,
  onCopy
}: {
  blocked: InterpreterMissing;
  label: string;
  install: AgentInstallDisplay | null;
  nowMs?: number;
  onCopy: (command: string) => void;
}): React.JSX.Element {
  return (
    <ol className="launch-block-ways">
      {install !== null && !install.canonicalIsPackageManager ? (
        <li>
          Install {label} the way its provider recommends. That version does
          not need {blocked.interpreter}.
          <div className="agent-missing">
            <code className="agent-missing-cmd">{install.command}</code>
            <button
              type="button"
              className="icon-btn agent-missing-copy"
              aria-label={`Copy install command for ${label}`}
              title="Copy install command"
              onClick={() => onCopy(install.command)}
            >
              <Codicon name="copy" size={12} />
            </button>
          </div>
          <InstallSourceLines
            install={install}
            {...(nowMs !== undefined ? { nowMs } : {})}
          />
        </li>
      ) : (
        <li>
          Install {binName(blocked.binPath)} another way, one that does not
          need {blocked.interpreter}.
        </li>
      )}
      <li>
        Make {blocked.interpreter} visible to Tortie. Add its directory to
        your login shell&rsquo;s startup file, then quit Tortie and open it
        again.
      </li>
    </ol>
  );
}

/**
 * Settings → Launch defaults for one agent, filtered to the presets the
 * modal actually offers (verified). Danger defaults pre-check too — the
 * warning styling still renders (S6).
 */
export function seededFlags(
  agent: string,
  settings: Pick<GmuxSettings, 'launchDefaults'>,
  presets: readonly AgentFlagPresetView[]
): readonly string[] {
  const enabled =
    (settings.launchDefaults as Record<string, string[] | undefined>)[
      agent
    ] ?? [];
  if (enabled.length === 0) return [];
  const offered = new Set(presets.map((p) => p.flag));
  return enabled.filter((f) => offered.has(f));
}

/**
 * The presets that are ON, in preset order.
 *
 * PHASE 86. This is the ONE expression behind both the collapsed Options
 * summary's count and the argv the create actually sends. A flag can never be
 * seeded on, hidden by the collapse and left out of the count, because the
 * count and the argv read the same list. Exported for the unit test.
 */
export function activePresets(
  presets: readonly AgentFlagPresetView[],
  checkedFlags: readonly string[]
): readonly AgentFlagPresetView[] {
  return presets.filter((p) => checkedFlags.includes(p.flag));
}

/**
 * What the collapsed Options summary says. The number is always drawn,
 * including zero, so a summary that reads a number means that number.
 */
export function optionsSummaryText(activeCount: number): string {
  return `Options, ${activeCount} on`;
}

/**
 * Said once, on the summary, when one of the flags that is on widens what the
 * agent may do. The rows themselves keep the warning glyph they already had.
 */
export const OPTIONS_DANGER_SENTENCE =
  'One of the options that is on changes what the agent is allowed to do.';

export function CreateSessionModal(): React.JSX.Element | null {
  const open = useApp((s) => s.createOpen);
  const setOpen = useApp((s) => s.setCreateOpen);
  const projects = useApp((s) => s.projects);
  const activeProjectId = useApp((s) => s.activeProjectId);
  const sessions = useApp((s) => s.sessions);
  const createSession = useApp((s) => s.createSession);

  const project = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  );

  const projectSessions = useMemo(
    () => (project ? sessions.filter((x) => x.projectPath === project.path) : []),
    [sessions, project]
  );

  const avail = useAgentAvailability();
  // One settings truth across windows: persisted settings (default agent +
  // launch defaults), flag catalogs, and the agents:list scan all come from
  // the shared store (src/renderer/settings/settings-store.ts).
  const initSettings = useSettingsStore((s) => s.init);
  const settings = useSettingsStore((s) => s.settings);
  const catalogs = useSettingsStore((s) => s.catalogs);
  const scan = useSettingsStore((s) => s.scan);
  const updateSettings = useSettingsStore((s) => s.update);
  // Phase 48. `Try again` asks main to look again, so the tile that said
  // "not installed" can stop saying it.
  const rescanAgents = useSettingsStore((s) => s.rescan);
  useEffect(() => {
    initSettings();
  }, [initSettings]);
  const options = useMemo(
    () => buildAgentOptions(scan, avail),
    [scan, avail]
  );

  const [agent, setAgent] = useState<LaunchableAgentKind>('claude');
  /**
   * PHASE 70. The machine this session will be created on. `'local'` is this
   * Mac, and it is what every create before this release did.
   */
  const [machineId, setMachineId] = useState('local');
  /**
   * The machines a person may choose, being the confirmed ones and no others.
   *
   * It is read once per opening of the sheet from the channel Settings already
   * uses, so this phase adds no channel of its own. An empty list is the
   * ordinary case, and the choice is then not drawn at all: a control with one
   * option answers no question.
   */
  const [machines, setMachines] = useState<MachineRowView[]>([]);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [cwd, setCwd] = useState('');
  const [dirError, setDirError] = useState<string | null>(null);
  /**
   * PHASE 84. Whether the folder picker for the chosen machine is open.
   *
   * It is an inline panel under the Directory field rather than a second
   * dialog, so there is one Escape to press and one focus trap to be inside.
   */
  const [pickerOpen, setPickerOpen] = useState(false);
  const [genericError, setGenericError] = useState<string | null>(null);
  // Agent whose binary create-time resolution POSITIVELY reported missing
  // (AGENT_NOT_FOUND) — pins the caption row, because the boot-time scan can
  // be stale (e.g. CLI uninstalled since). Phase 48 widened it from an id to
  // the id plus main's own sentence, so the sheet can draw the whole state.
  const [absent, setAbsent] = useState<AgentAbsent | null>(null);
  // PHASE 48. The create was refused before the launch because the resolved
  // file is a script whose interpreter is not reachable. Null on every other
  // outcome. PHASE 49 pinned the refused agent's id onto it: the block's
  // provider-route branch reads that agent's install row, and the selection
  // can move after the refusal is on screen.
  const [blocked, setBlocked] = useState<
    (InterpreterMissing & { agentId: string }) | null
  >(null);
  // Last disabled chip the user hovered/focused — drives the caption row.
  const [hintAgent, setHintAgent] = useState<string | null>(null);
  // Per-agent checked preset flags for THIS modal opening; agents absent from
  // the map show their Settings launch defaults (per-session, never written
  // back to Settings).
  const [flagSel, setFlagSel] = useState<Record<string, readonly string[]>>(
    {}
  );
  const [creating, setCreating] = useState(false);
  /**
   * PHASE 86. Whether the Options block is expanded, for this opening of the
   * sheet only.
   *
   * It starts closed every time and it remembers nothing across openings,
   * which is the whole point: the sheet is the same height on every ⌘T, and
   * that height no longer depends on how many presets the selected agent
   * happens to have. It never auto expands either, not even when a flag is
   * already on, because auto expanding would put the variable height back.
   * The summary carries the count instead, and the count is drawn even when
   * it is zero.
   */
  const [optionsOpen, setOptionsOpen] = useState(false);
  /**
   * SpecStory capture for THIS session. null = the user has not touched the
   * switch, so the per-agent sticky default answers — which is what makes
   * changing agent mid-sheet pick up that agent's remembered choice instead
   * of carrying the previous agent's over.
   */
  const [captureChoice, setCaptureChoice] = useState<boolean | null>(null);
  const nameRef = useRef<HTMLInputElement | null>(null);
  /**
   * True once the person has chosen an agent on the board themselves.
   *
   * A ref rather than state, because nothing renders from it and a render is
   * exactly what it must not cause. It gates the settle hop below.
   */
  const agentPickedByUser = useRef(false);
  const toast = useApp((s) => s.toast);
  const specstory = useSpecStoryStatus(open);

  // Reset on open; prefill name `<agent>-<n>` and cwd = project root.
  // Default agent: Settings default → claude → first installed → shell.
  useEffect(() => {
    if (!open) return;
    const initial = defaultAgentChoice(options, settings.defaultAgent);
    setAgent(initial);
    // Phase 70. Every opening of the sheet starts on this Mac. A remembered
    // machine would mean a person who created one remote session two days ago
    // presses ⌘T ↩ and starts a process on another computer.
    setMachineId('local');
    setNameTouched(false);
    setName(`${initial}-${nextOrdinal(projectSessions, initial)}`);
    setCwd(project?.path ?? '');
    setDirError(null);
    setPickerOpen(false);
    setGenericError(null);
    setAbsent(null);
    setBlocked(null);
    setHintAgent(null);
    setFlagSel({});
    setOptionsOpen(false);
    setCaptureChoice(null);
    setCreating(false);
    // A new opening of the sheet has no choice behind it yet, so the first
    // settle is allowed to hop again.
    agentPickedByUser.current = false;
    requestAnimationFrame(() => nameRef.current?.select());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If detection settles AFTER open and the selected agent turned out to be
  // missing, hop to the best installed one.
  //
  // THE HOP IS FOR THE FIRST SETTLE AND FOR NOTHING ELSE (Phase 48 fix round).
  // `Try again` asks main to rescan, the rescan republishes the same answer,
  // this effect ran again, and the selection moved to shell while the block
  // above still read "Claude Code is not installed" beside a button still
  // labelled "Try again". The name field became shell-1 and the next click
  // created a shell session. A verifier drove it live and the third click
  // produced a session named shell-1.
  //
  // Two guards, and each one alone would have been enough. A person who picked
  // the agent keeps it, because a sheet must not silently launch something
  // other than what its board shows as selected. And a refusal that is on
  // screen freezes the selection, because that block is about THIS agent and
  // its buttons act on THIS agent.
  useEffect(() => {
    if (!open) return;
    if (agentPickedByUser.current) return;
    if (absent !== null || blocked !== null) return;
    const current = options.find((o) => o.id === agent);
    if (current !== undefined && current.installed) return;
    setAgent(defaultAgentChoice(options, settings.defaultAgent));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options, absent, blocked]);

  // Re-prefill the name when the agent changes and the user hasn't typed.
  useEffect(() => {
    if (!open || nameTouched) return;
    setName(`${agent}-${nextOrdinal(projectSessions, agent)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent]);

  // If the modal opened before projects finished loading, backfill the
  // directory once the project is known.
  //
  // PHASE 70: not while a machine is chosen. The empty field is deliberate
  // there, and this would refill it with a path that exists on this Mac and
  // means nothing on the other machine.
  useEffect(() => {
    if (open && machineId === 'local' && cwd.length === 0 && project) {
      setCwd(project.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project, machineId]);

  /**
   * PHASE 70. Read the machines once per opening, from the channel Settings
   * already uses. It starts nothing: `machines:rows` reads memory in main and
   * the sealed record, and it spawns no process.
   *
   * Only confirmed rows are offered. An unconfirmed row would refuse in main
   * anyway, and offering a choice that cannot be taken spends the person a
   * name and a click to find that out.
   */
  useEffect(() => {
    if (!open) return undefined;
    const api = window.gmux?.machines;
    if (api === undefined) {
      setMachines([]);
      return undefined;
    }
    let cancelled = false;
    void api.rows().then(
      (result) => {
        if (!cancelled) setMachines(result.rows.filter((row) => row.usable));
      },
      () => {
        // A build with no machines file, or a read that failed. The choice is
        // then not drawn, which is the same sheet as before this release.
        if (!cancelled) setMachines([]);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open || !project) return null;

  // Only VERIFIED presets are offered as toggles (flags seen in the installed
  // CLI's --help — src/main/agents/flags.ts provenance discipline).
  const catalog = (
    catalogs as Record<string, AgentFlagCatalogView | undefined>
  )[agent];
  const presets = catalog?.presets.filter((p) => p.verified) ?? [];
  const checkedFlags = flagSel[agent] ?? seededFlags(agent, settings, presets);
  // PHASE 86. The one list the summary counts and the create sends.
  const active = activePresets(presets, checkedFlags);
  const anyDanger = active.some((p) => p.danger);
  const selectedOption = options.find((o) => o.id === agent);

  // PHASE 70. The machine this create will run on, or null for this Mac. A
  // chosen id that is no longer in the list reads as this Mac, which is the
  // safe direction: it starts nothing anywhere else.
  const machine =
    machineId === 'local'
      ? null
      : (machines.find((row) => row.id === machineId) ?? null);
  const remote = machine !== null;

  // SpecStory capture (Phase 15). Offered only where it would actually work:
  // a resolved binary AND a provider for this agent (shells never).
  //
  // PHASE 70 adds one term. Capture runs the agent under the SpecStory program
  // ON THIS MAC and writes the transcript to a folder here, and neither is
  // true of a session on another machine, so the row is not drawn for one. The
  // honesty block under the machine choice says the same thing in words.
  const captureOffered = captureAvailableFor(specstory, agent) && !remote;
  const capture =
    captureChoice ?? captureDefaultFor(settings, agent);
  const setCapture = (on: boolean): void => setCaptureChoice(on);
  // Where the transcript goes, in the two states that differ. Signed out says
  // only what IS true — no "sign in to also…" pitch in a create sheet.
  const captureCaption = specstory?.auth.signedIn === true
    ? specstory.auth.email !== null
      ? `Saved under .specstory/history and synced to SpecStory Cloud as ${specstory.auth.email}.`
      : 'Saved under .specstory/history and synced to SpecStory Cloud.'
    : 'Saved in this folder under .specstory/history.';

  const togglePreset = (preset: AgentFlagPresetView): void => {
    const isOn = checkedFlags.includes(preset.flag);
    let next: string[];
    if (isOn) {
      next = checkedFlags.filter((f) => f !== preset.flag);
    } else {
      // Checking one value of a value-taking flag unchecks its rivals
      // (--sandbox workspace-write vs --sandbox danger-full-access).
      next = checkedFlags.filter((f) => {
        const rival = presets.find((p) => p.flag === f);
        return rival === undefined || !presetsConflict(rival, preset);
      });
      next.push(preset.flag);
    }
    setFlagSel({ ...flagSel, [agent]: next });
  };

  const selectAgent = (opt: AgentPickerOption): void => {
    if (!opt.installed) {
      setHintAgent(opt.id);
      return;
    }
    // Phase 23 fix round. A configured agent the gate will refuse cannot be
    // checked, for the same reason a missing one cannot: the create would fail
    // and the person would have spent a name and a click finding out. The
    // reason goes in the caption row under the board, which is where this
    // sheet already puts recovery copy.
    const blocked = agentBlockedReason(opt);
    if (blocked !== null) {
      setHintAgent(opt.id);
      return;
    }
    agentPickedByUser.current = true;
    setAgent(opt.id);
  };

  /**
   * @param startAnyway PHASE 48. Set by `Start it anyway` and by nothing
   *                    else. It sends the same argv the preflight refused,
   *                    because the check reads a shebang and can be wrong
   *                    about a wrapper that re-execs through something Tortie
   *                    cannot see. The person gets the last word.
   */
  const submit = (startAnyway = false): void => {
    if (creating) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      setGenericError('Give the session a name.');
      nameRef.current?.focus();
      return;
    }
    setCreating(true);
    setDirError(null);
    setGenericError(null);
    setAbsent(null);
    setBlocked(null);
    const extraArgs = activePresets(presets, checkedFlags).flatMap((p) =>
      presetArgvTokens(p.flag)
    );
    // Remember the capture answer per agent, but only when this sheet could
    // actually ask the question and the user actually answered it — a sheet
    // that never showed the row must not write a default, and a cancelled
    // sheet writes nothing at all (this runs on submit, not on the flip).
    if (captureOffered && captureChoice !== null && agent !== 'shell') {
      const stored = captureDefaultFor(settings, agent);
      if (stored !== captureChoice) {
        void updateSettings({
          captureDefaults: {
            ...settings.captureDefaults,
            [agent]: captureChoice
          }
        });
      }
    }
    void createSession({
      name: trimmed,
      agent,
      // PHASE 70. Sent only when a machine was chosen. Absent is this Mac,
      // which is every create before this release.
      ...(machine !== null ? { machineId: machine.id } : {}),
      ...(cwd.trim().length > 0 ? { cwd: cwd.trim() } : {}),
      ...(extraArgs.length > 0 ? { extraArgs } : {}),
      ...(captureOffered && capture ? { capture: true } : {}),
      ...(startAnyway ? { startAnyway: true } : {})
    })
      .then((ok) => {
        if (ok) setOpen(false);
        else setCreating(false);
      })
      .catch((err: unknown) => {
        setCreating(false);
        const payload = errorPayload(err);
        if (
          payload?.code === 'INVALID_INPUT' &&
          payload.message.toLowerCase().includes('working directory')
        ) {
          setDirError('Directory not found');
        } else if (payload?.code === 'AGENT_NOT_FOUND') {
          // Friendly state, never a dead pane (Bug A): name the problem and
          // draw the whole state under the grid (Phase 48).
          if (agent !== 'shell') {
            setAbsent({ agentId: agent, message: payload.message });
          } else {
            setGenericError(payload.message);
          }
        } else if (payload?.code === 'AGENT_INTERPRETER_MISSING') {
          // PHASE 48. The agent IS installed. Its interpreter is not
          // reachable, so the pane would have opened and closed within a
          // second and Tortie did not start it.
          const read = readInterpreterDetail(payload.detail, payload.message);
          if (read !== null) setBlocked({ ...read, agentId: agent });
          else setGenericError(payload.message);
        } else {
          setGenericError(errorText(err));
        }
      });
  };

  /**
   * PHASE 48. State A's one action. It drops the boot probe's cached answer
   * and asks main to scan again, so a tile that says "not installed" stops
   * saying it once the install has happened, then it re-submits the same
   * form. The scan is not awaited: the create path resolves the binary for
   * itself, and the scan only refreshes the tiles.
   */
  const tryAgain = (): void => {
    resetAgentAvailabilityCache();
    void rescanAgents();
    submit();
  };

  const chooseDirectory = (): void => {
    void window.gmux?.projects.pickDirectory().then((dir) => {
      if (dir !== null) {
        setCwd(dir);
        setDirError(null);
      }
    });
  };

  // Install row: a create-time AGENT_NOT_FOUND pins it; otherwise it echoes
  // the last hovered/focused missing tile. It renders ONLY when there is a
  // command to hand over — the tile already said "not installed", so a row
  // that just repeats that in a sentence is noise (Phase 12.12 item 1).
  // PHASE 49: the command comes from the scan row's install map, never from
  // a hand-typed renderer table, so it now renders for every not-installed
  // agent whose provider publishes a command.
  const captionId = absent?.agentId ?? hintAgent;
  const captionOption = options.find((o) => o.id === captionId);
  const captionCmd = captionOption?.install?.command ?? null;
  // Reserve the row's height only when this machine could actually show it,
  // so the sheet never jumps as the pointer sweeps the board — and never
  // carries 24px of dead space on the usual machine, where every agent gmux
  // knows an install command for is already installed.
  const reserveInstallRow = options.some(
    (o) => !o.installed && o.install !== null
  );
  // PHASE 49. The absent agent's install row, for state A's source line. Null
  // for an agent with no published command, which draws the one no-command
  // sentence instead.
  const absentInstall: AgentInstallDisplay | null =
    absent !== null
      ? (options.find((o) => o.id === absent.agentId)?.install ?? null)
      : null;
  // PHASE 49. The refused agent's own picker option, for state B's
  // provider-route branch. The selection can move while the block is on
  // screen, so the block never reads from `selectedOption`.
  const blockedOption =
    blocked !== null
      ? options.find((o) => o.id === blocked.agentId)
      : undefined;
  // Phase 23 fix round. The confirm gate's sentence for whichever configured
  // tile the pointer or the keyboard last reached. It has its own row rather
  // than sharing the install row, because the two say different things and the
  // install row only renders when there is a command to hand over.
  const blockedCaption =
    captionOption !== undefined ? agentBlockedReason(captionOption) : null;

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="New session"
        onKeyDown={(e) =>
          modalKeyDown(e, e.currentTarget, {
            // Wrapped, so a key handler can never pass its event in as the
            // `startAnyway` argument.
            submit: () => submit(),
            close: () => setOpen(false)
          })
        }
      >
        <h2 className="modal-title">New session</h2>

        <div className="field">
          <span className="field-label" id="agent-label">
            Agent
          </span>
          <AgentGrid
            mode="select"
            options={options}
            primaryId={agent}
            onActivate={selectAgent}
            onHint={setHintAgent}
            ariaLabelledBy="agent-label"
          />
          {reserveInstallRow ? (
            <>
              <div className="agent-missing" aria-live="polite">
                {captionOption !== undefined && captionCmd !== null ? (
                  <>
                    <span className="agent-missing-text">
                      Install {captionOption.label}:
                    </span>
                    <code className="agent-missing-cmd">{captionCmd}</code>
                    <button
                      type="button"
                      className="icon-btn agent-missing-copy"
                      aria-label={`Copy install command for ${captionOption.label}`}
                      title="Copy install command"
                      onClick={() => {
                        void navigator.clipboard.writeText(captionCmd).then(
                          () => toast('info', 'Install command copied'),
                          () => toast('error', 'Could not copy the command')
                        );
                      }}
                    >
                      <Codicon name="copy" size={12} />
                    </button>
                  </>
                ) : null}
              </div>
              {/* Phase 48. The command is there to be copied and run in a
                  terminal. Tortie never runs it, and saying so once is
                  cheaper than a person waiting for something to happen. The
                  row's height is reserved on the same terms as the row above
                  it, so a pointer sweeping the board still moves nothing. */}
              <div className="field-caption install-note">
                {captionOption !== undefined && captionCmd !== null
                  ? INSTALL_NOTE_LINE
                  : null}
              </div>
            </>
          ) : null}
          {blockedCaption !== null ? (
            <div className="field-caption warn" aria-live="polite">
              {blockedCaption}
            </div>
          ) : null}
          {selectedOption?.unverified === true ? (
            <div className="field-caption">
              {selectedOption.label} support is early — resume may not work
              yet.
            </div>
          ) : null}
        </div>

        {/* PHASE 70. The machine choice. It is drawn only when there is a
            machine to choose, so a person with none sees the sheet they have
            always seen. This Mac is first and is the value on every opening. */}
        {machines.length > 0 ? (
          <div className="field">
            <label className="field-label" htmlFor="session-machine">
              {MACHINE_FIELD_LABEL}
            </label>
            <select
              id="session-machine"
              className="input"
              value={machineId}
              onChange={(e) => {
                const next = e.target.value;
                setMachineId(next);
                setDirError(null);
                // PHASE 84. The folders on screen belong to whichever machine
                // was chosen a moment ago, so the panel shuts rather than
                // showing one machine's folders under another machine's name.
                setPickerOpen(false);
                // The directory belongs to whichever machine is chosen, so it
                // is never carried across. This Mac gets the project root back
                // and another machine starts empty, because Tortie holds no
                // list of home directories on other machines.
                setCwd(next === 'local' ? (project?.path ?? '') : '');
              }}
            >
              <option value="local">{THIS_MAC}</option>
              <MachineOptions rows={machines} />
            </select>
            {/* Once, not per row. The answer is the same for every machine in
                the list that is off, and three copies of one sentence is three
                times the reading for one fact. */}
            {anyMachineNotReady(machines) ? (
              <p className="field-caption">{MACHINE_NOT_SIGNED_IN_HINT}</p>
            ) : null}
            {remote
              ? CREATE_HONESTY_LINES.map((line) => (
                  <p key={line} className="field-caption">
                    {line}
                  </p>
                ))
              : null}
          </div>
        ) : null}

        <div className="field">
          <label className="field-label" htmlFor="session-name">
            Name
          </label>
          <input
            id="session-name"
            ref={nameRef}
            className="input"
            value={name}
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="session-dir">
            {/* PHASE 70. The label names the machine, because the path is read
                there and nowhere else. */}
            {machine !== null ? createDirLabel(machine.label) : 'Directory'}
          </label>
          <div className="field-row">
            <input
              id="session-dir"
              className={`input input-mono${dirError !== null ? ' input-error' : ''}`}
              value={cwd}
              spellCheck={false}
              autoComplete="off"
              {...(machine !== null
                ? { placeholder: createDirPlaceholder(machine.label) }
                : {})}
              onChange={(e) => {
                setCwd(e.target.value);
                setDirError(null);
              }}
            />
            {/* The panel macOS ships walks THIS Mac's disk, so it is offered
                for this Mac only. A folder picked in it would name nothing on
                the other computer.

                PHASE 84. A machine gets a picker of its own instead of
                nothing, drawn by Tortie out of one read of one folder at a
                time. Both buttons say what they open, and neither of them can
                reach the other computer's files. */}
            {machine === null ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={chooseDirectory}
              >
                Choose…
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-secondary"
                aria-expanded={pickerOpen}
                data-create-action="browse-machine"
                onClick={() => setPickerOpen((v) => !v)}
              >
                {DIR_PICKER_OPEN}
              </button>
            )}
          </div>
          {machine !== null && pickerOpen ? (
            <RemoteDirPicker
              machineId={machine.id}
              machineLabel={machine.label}
              initialPath={cwd.trim()}
              onChoose={(path) => {
                setCwd(path);
                setDirError(null);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          ) : null}
          {machine !== null ? (
            <>
              <p className="field-caption">{CREATE_DIR_HINT}</p>
              <p className="field-caption">{CREATE_DIR_EMPTY_HINT}</p>
            </>
          ) : null}
          {dirError !== null ? (
            <div className="input-error-text">{dirError}</div>
          ) : null}
        </div>

        {/* PHASE 86. The Options block starts collapsed, so the sheet's height
            does not change with the selected agent's preset count. The
            summary always names how many are on, so a flag seeded from
            Settings cannot hide behind the collapse. It is a plain button and
            not a <details>/<summary>, because Enter on a summary element
            would both toggle the block and, under this phase's Enter rule,
            reach the sheet's Create. */}
        {presets.length > 0 ? (
          <div className="field">
            <button
              type="button"
              className="options-summary"
              aria-expanded={optionsOpen}
              aria-controls="options-group"
              onClick={() => setOptionsOpen(!optionsOpen)}
              {...(anyDanger
                ? {
                    title: OPTIONS_DANGER_SENTENCE,
                    'aria-label': `${optionsSummaryText(active.length)}. ${OPTIONS_DANGER_SENTENCE}`
                  }
                : {})}
            >
              <Codicon
                name={optionsOpen ? 'chevron-down' : 'chevron-right'}
                size={12}
                className="options-chevron"
              />
              <span className="options-summary-text">
                {optionsSummaryText(active.length)}
              </span>
              {anyDanger ? (
                <Codicon
                  name="warning"
                  size={14}
                  className="preset-warning"
                />
              ) : null}
            </button>
            <div
              id="options-group"
              role="group"
              aria-label="Options"
              hidden={!optionsOpen}
            >
              {presets.map((preset) => {
                const on = checkedFlags.includes(preset.flag);
                return (
                  <label
                    key={preset.flag}
                    className={`preset-row${preset.danger ? ' danger' : ''}`}
                    title={preset.description}
                  >
                    <input
                      type="checkbox"
                      className="preset-check"
                      checked={on}
                      onChange={() => togglePreset(preset)}
                    />
                    {preset.danger ? (
                      <Codicon
                        name="warning"
                        size={14}
                        className="preset-warning"
                      />
                    ) : null}
                    <span className="preset-label">{preset.label}</span>
                    <code className="preset-flag">{preset.flag}</code>
                  </label>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Phase 15 — SpecStory capture. The row exists only when this
            machine can actually do it: a resolved SpecStory binary AND a
            provider for the selected agent. An offer that would be declined
            at spawn is worse than no offer. */}
        {captureOffered ? (
          <div className="field">
            <span className="field-label" id="capture-label">
              Capture
            </span>
            <label className="preset-row">
              <input
                type="checkbox"
                className="preset-check"
                checked={capture}
                onChange={() => setCapture(!capture)}
              />
              <span className="preset-label">
                Save this session&rsquo;s history with SpecStory
              </span>
            </label>
            <p className="field-caption">{captureCaption}</p>
          </div>
        ) : null}

        {/* PHASE 48. The two states a create can be refused in, each drawn in
            full with the one action that can change the outcome. Everything
            else still gets the one-line error row it always had. */}
        {blocked !== null ? (
          <div className="launch-block" role="alert">
            <h3 className="launch-block-title">
              {binName(blocked.binPath)} is installed but cannot start
            </h3>
            <p className="launch-block-body">{blocked.message}</p>
            <p className="launch-block-body">There are two ways forward.</p>
            <BlockedWays
              blocked={blocked}
              label={blockedOption?.label ?? binName(blocked.binPath)}
              install={blockedOption?.install ?? null}
              onCopy={(command) => {
                void navigator.clipboard.writeText(command).then(
                  () => toast('info', 'Install command copied'),
                  () => toast('error', 'Could not copy the command')
                );
              }}
            />
            <div className="launch-block-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={creating}
                onClick={() => submit(true)}
              >
                Start it anyway
              </button>
            </div>
          </div>
        ) : absent !== null ? (
          <div className="launch-block" role="alert">
            <h3 className="launch-block-title">
              {agentShortLabel(absent.agentId)} is not installed
            </h3>
            <p className="launch-block-body">{absent.message}</p>
            {/* PHASE 49. The command block itself is the pinned caption row
                above the board. Under it, name where the command was read
                from and when. An agent with no published command (muse, a
                configured agent) gets the one no-command sentence instead. */}
            {absentInstall !== null ? (
              <InstallSourceLines install={absentInstall} />
            ) : (
              <p className="launch-block-body">
                {noInstallCommandLine(agentShortLabel(absent.agentId))}
              </p>
            )}
            <div className="launch-block-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={creating}
                onClick={tryAgain}
              >
                Try again
              </button>
            </div>
          </div>
        ) : genericError !== null ? (
          <div className="modal-error">{genericError}</div>
        ) : null}

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={creating || dirError !== null}
            onClick={() => submit()}
          >
            {creating ? 'Creating…' : 'Create'}
            {!creating ? <span aria-hidden="true">↩</span> : null}
          </button>
        </div>
      </div>
    </div>
  );
}
