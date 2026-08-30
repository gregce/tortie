/**
 * S9 — full-window states: the project with no sessions (§6.2) and tmux
 * missing (§6.4). Titles and bodies are DESIGN.md §6 copy.
 *
 * §6.1, the state with no project open, is no longer written here. Phase 18.6
 * turned it into the home screen, which carries the product's name, its own
 * data and its own three verbs, so it lives in ./HomeScreen. `FirstRun` stays
 * as the thin wrapper App renders, and it is the ONE place the home screen is
 * wired to the rest of the app.
 *
 * §6.2 is the first thing a user sees inside a new project, so it does more
 * than name the absence: it shows the whole fleet Tortie can run, in the
 * registry's own order (src/main/agents/registry.ts, mirrored by
 * buildAgentOptions). Installed agents are one-click launchers carrying any
 * hotkey the user recorded in Settings; the rest stay present but recessive
 * — Tortie picks them up the moment their CLI appears on PATH.
 *
 * The board itself is no longer written here: Phase 12.12 item 1 made it the
 * shared ./AgentGrid, because the ⌘T sheet had grown a second, cramped copy of
 * the same idea. This state keeps the copy, the caption and the launch — the
 * things that are its own.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { keyDisplay } from '@shared/keymap';
import { useApp } from '../state/store';
// Phase 123: the two boot verbs are the lifecycle owner's, not the store's.
import { retryBootApp } from '../state/subscriptions';
import {
  agentsGreyedByMachine,
  buildAgentOptions,
  defaultAgentChoice,
  INSTALL_NOTE_LINE,
  useAgentAvailability,
  type AgentPickerOption
} from '../state/agents';
// PHASE 109. On a tab whose files are on a machine, the fleet reads that
// machine's own answer, and the caption for a greyed tile is one sentence
// with NO install command, because the command Tortie holds was read for
// this Mac.
import { machineAgentsFor, machineLabelFor } from '../state/machines-slice';
import { agentMissingOnMachine, agentsAbsentHint } from '../machines/machine-agents';
import { useSettingsStore } from '../settings/settings-store';
import { cloneAction } from '../state/clone';
// Phase 12.12 item 1: the fleet board is a shared component now — the ⌘T
// sheet renders the identical tiles from ./AgentGrid.
//
// PHASE 86. Every tile is its own Tab stop, in this launch board and in the
// ⌘T sheet's picker. This surface already behaved that way, because launch
// mode never set a roving tabindex. What changed here is that a project
// created from the New Project or Clone dialog now really does hand the
// keyboard to the default tile: focusFleetPrimary() was querying a class this
// board stopped drawing in Phase 12.12, so the handoff moved focus nowhere.
import { AgentGrid } from './AgentGrid';
import { Codicon } from '../icons';
import { HomeScreen } from './HomeScreen';
// PHASE 149. The in-window mark on the state a project with no sessions
// draws. It is the SAME cat the dock icon draws, copied out of the brand
// package by `npm run icon` exactly the way tortie-128.png beside it is, so
// the bundler emits it and the packaged build carries it. It is out of flow
// and it is not announced, because it says nothing a screen reader needs.
//
// READ THIS BEFORE CHANGING THE PATH. The charter named a different file, and
// the phase did not follow it. Its words are "the source is decided and it is
// `tortie.png` at the repository root, 3196 by 1980, which he confirmed is the
// cat he wants, being the same one the dock icon draws". Those two halves
// cannot both be true. `tortie.png` at the root is the README product
// screenshot of the Tortie window, referenced at README.md line 33, and it is
// not a cat. The cat is `docs/brand/tortie/dock/tortie-dock-512.png`, and the
// file imported below is a byte for byte copy of it, sha256 0815e6d0, so no
// artwork was drawn or altered, which is the refusal the charter actually
// binds. The phase followed the half that names the picture rather than the
// half that names the path, because a ghost of the app's own screenshot
// behind its own empty state is plainly not what was asked for.
//
// IF THE SCREENSHOT WAS MEANT LITERALLY, this import is the whole change.
import tortieMark from '../assets/brand/tortie-512.png';
// PHASE 109 PUT THIS IMPORT ON ONE LINE. This file joined the machine
// vocabulary audit, which strips single line import declarations before it
// reads string literals, and a module path is not copy. Splitting it back
// over six lines puts the path's own name in front of the audit again.
// prettier-ignore
import { COPY_COMMAND_TOASTS, TMUX_BUNDLE_INCOMPLETE_COPY, TMUX_MISSING_COPY, TMUX_VERSION_BLOCKED_COPY } from './tmux-block-copy';
import './empty-states.css';

/**
 * §6.1 — no project open. The whole screen is ./HomeScreen, and this wrapper
 * is only the wiring.
 *
 * `cloneAction()` is the Clone verb on a build that can clone and undefined on
 * one that cannot, so an older preload hides the Clone row rather than
 * offering a button that throws (research 35 §3.14). It is a module function
 * with a stable identity, so calling it during render costs nothing.
 *
 * Recents need no wiring here. The screen reads state/recents itself, and that
 * store reports an empty list on a build with no recents bridge, which draws
 * the first-launch state.
 */
export function FirstRun(): React.JSX.Element {
  return <HomeScreen onClone={cloneAction()} />;
}

// ---------------------------------------------------------------------------
// §6.2 — project with no sessions: the fleet
// ---------------------------------------------------------------------------

/**
 * PHASE 130. The two sentences the copy control says out loud.
 *
 * The label names the agent, because a screen reader reads the board one
 * control at a time and "Copy the install command" on its own does not say
 * whose. The title is the shorter one, because a tooltip sits beside the
 * command it copies and the name is already on screen.
 */
export function copyInstallCommandLabel(label: string): string {
  return `Copy the install command for ${label}`;
}

/** The tooltip on the same control. */
export const COPY_INSTALL_COMMAND_TITLE = 'Copy the install command';

/**
 * PHASE 49. The caption under the fleet for a missing agent, reading the
 * provider's own command from the scan row rather than from a hand-typed
 * table. Exported pure so the unit tests can pin both sentences.
 *
 * PHASE 130. The command used to be one shrinkable child of a centred flex
 * ROW, so in the 660px column it was cut to eight characters and there was no
 * way to copy it. The operator read `curl -f…` under a sentence telling him
 * to copy it. The caption is a column now, the command has its own line and
 * wraps, and the copy control beside it is the same one the three boot block
 * screens already draw.
 *
 * The component stays hook free, so `renderToStaticMarkup` keeps working in
 * the unit test. The caller owns the clipboard write and the toast, exactly
 * the way `CommandRow` below does.
 */
export function HintedInstallCaption({
  option,
  machineLabel = null,
  onCopy
}: {
  option: AgentPickerOption;
  /**
   * PHASE 109. Set on a tab whose files are on a machine. The caption is then
   * one sentence naming that machine, and NO install command: the command
   * Tortie holds was read for this Mac, and its package manager says nothing
   * about the machine the session will run on.
   */
  machineLabel?: string | null;
  /** Copies the command. The caller owns the toast, the way CommandRow does. */
  onCopy: (command: string) => void;
}): React.JSX.Element {
  const install = option.install;
  if (machineLabel !== null) {
    return (
      <span className="agent-missing-text">
        {agentMissingOnMachine(option.label, machineLabel)}
      </span>
    );
  }
  if (install === null) {
    return (
      <span className="agent-missing-text">
        {option.label} is not installed. Tortie finds it as soon as it is on
        your login shell&rsquo;s PATH.
      </span>
    );
  }
  return (
    <>
      <span className="agent-missing-text">
        {option.label} is not installed. Copy this command and run it in a
        terminal.
      </span>
      <span className="code-row">
        <code className="onb-cmd">{install.command}</code>
        <button
          type="button"
          className="icon-btn"
          aria-label={copyInstallCommandLabel(option.label)}
          title={COPY_INSTALL_COMMAND_TITLE}
          data-p130-copy-install="1"
          onClick={() => onCopy(install.command)}
        >
          <Codicon name="copy" size={14} />
        </button>
      </span>
      <span className="agent-missing-text">{INSTALL_NOTE_LINE}</span>
    </>
  );
}

export function NoSessions(): React.JSX.Element {
  const quickCreate = useApp((s) => s.quickCreate);
  // PHASE 130. The caption's copy control writes the clipboard here, the way
  // CommandRow does, so the caption itself stays a pure function the unit
  // test can render to static markup.
  const toast = useApp((s) => s.toast);
  const project = useApp((s) => s.activeProject());
  const avail = useAgentAvailability();
  // Same settings truth as the ⌘T modal and the Settings window: the agent
  // detection scan (installed / early-support) and the recorded hotkeys.
  const initSettings = useSettingsStore((s) => s.init);
  const ensureScan = useSettingsStore((s) => s.ensureScan);
  const scan = useSettingsStore((s) => s.scan);
  const hotkeys = useSettingsStore((s) => s.settings.hotkeys);
  const defaultAgent = useSettingsStore((s) => s.settings.defaultAgent);
  // Phase 164. The tiles are a surface that draws from the scan, so this
  // mount is a demand. Measured on the parent commit with one project and no
  // sessions, the tiles are the first screen and the scan is needed here.
  useEffect(() => {
    initSettings();
    ensureScan();
  }, [initSettings, ensureScan]);

  // PHASE 109. The tab's own machine. On a machine tab the fleet reads that
  // machine's answer, this Mac's scan stops deciding which tiles are
  // selectable, and the label feeds the three sentences below.
  const machineStates = useApp((s) => s.machineStates);
  const machineAgents = useApp((s) => s.machineAgents);
  const tabMachineId = project?.machineId ?? 'local';
  const machineView = useMemo(
    () => machineAgentsFor(machineAgents, tabMachineId),
    [machineAgents, tabMachineId]
  );
  const machineLabel =
    machineView !== null ? machineLabelFor(machineStates, tabMachineId) : null;

  const options = useMemo(
    () => buildAgentOptions(scan, avail, machineView),
    [scan, avail, machineView]
  );
  // Same resolution the ⌘T modal preselects with, so the accented tile and
  // the two-keystroke path always name the same agent.
  const primaryId = defaultAgentChoice(options, defaultAgent);
  // The one caption line. Pointing at a missing agent PREVIEWS it and taking
  // the pointer away takes it back — a caption that only ever accumulates
  // would leave an error-shaped sentence pinned under an inviting empty state
  // after one accidental pass, inside an aria-live region at that. Clicking
  // pins it, because for claude and codex the caption carries an install
  // command the user has to be able to reach and select.
  const [hint, setHint] = useState<{ id: string; pinned: boolean } | null>(
    null
  );
  // The tile being launched, so a double-click can't open two sessions.
  const [starting, setStarting] = useState<string | null>(null);

  const start = (opt: AgentPickerOption): void => {
    if (!opt.installed) {
      setHint({ id: opt.id, pinned: true });
      return;
    }
    if (starting !== null) return;
    setStarting(opt.id);
    void quickCreate(opt.id).finally(() => setStarting(null));
  };

  const point = (id: string): void => {
    setHint((prev) =>
      prev?.id === id && prev.pinned ? prev : { id, pinned: false }
    );
  };
  const unpoint = (id: string): void => {
    setHint((prev) => (prev?.id === id && !prev.pinned ? null : prev));
  };

  const hinted = options.find((o) => o.id === hint?.id) ?? null;

  return (
    <div className="empty empty-fleet">
      <div className="empty-inner onb-inner">
        {/* PHASE 149. The cat sits above the heading and behind it, out of
            normal flow, so it cannot move the board the way Phase 139's
            caption moved this heading 26px. Its size and its opacity are both
            tokens. aria-hidden and an empty alt, because the sentence under it
            already says what this screen is. */}
        <img
          className="empty-mark"
          data-slot="empty-mark"
          src={tortieMark}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
        <h2 className="empty-title">No sessions yet</h2>
        <p className="empty-body">
          A session is a named terminal that survives quits, crashes, and
          restarts.
        </p>

        <AgentGrid
          mode="launch"
          options={options}
          primaryId={primaryId}
          hotkeys={hotkeys as Record<string, string | undefined>}
          startingId={starting}
          onActivate={start}
          onHint={point}
          onUnhint={unpoint}
          ariaLabel="Start a session"
          {...(machineLabel !== null ? { machineLabel } : {})}
        />

        {/* PHASE 109. Once under the board, only when that machine's own
            answer greyed at least one tile. An unknown answer greys nothing
            and says nothing. */}
        {machineLabel !== null &&
        agentsGreyedByMachine(options, machineView) ? (
          <p className="onb-hint">{agentsAbsentHint(machineLabel)}</p>
        ) : null}

        <p className="onb-hint">
          Click one to start it in{' '}
          <span className="onb-hint-strong">
            {project?.name ?? 'this project'}
          </span>
          , or press <span className="key">{keyDisplay('session.new')}</span> to
          name it and pick a
          directory.
        </p>

        {/* PHASE 139. The slot reserves the height and the caption is
            overlaid inside it, so a long install command cannot move the
            heading, the tiles or the hint line above it. The caption element
            is unchanged, so it is still the aria-live region that announces
            the command. empty-states.css carries the measurements. */}
        <div className="onb-caption-slot">
          <div className="onb-caption" aria-live="polite">
            {hinted !== null ? (
              <HintedInstallCaption
                option={hinted}
                machineLabel={machineLabel}
                onCopy={(command) => {
                  void navigator.clipboard.writeText(command).then(
                    () => toast('info', COPY_COMMAND_TOASTS.ok),
                    () => toast('error', COPY_COMMAND_TOASTS.failed)
                  );
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// §6.4 — the three screens that stop a boot
//
// THE WORD TMUX MAY APPEAR ON THESE THREE SURFACES AND NOWHERE ELSE. Design
// spec §6.4 made the tmux missing screen the one exception to the
// no-tmux-vocabulary rule, and Phase 41's two new screens are the same family
// and the same exception. The word is here for one reason: the user has to
// type a command that spells it. A later cleanup must not "fix" this.
//
// The sentences live in ./tmux-block-copy, which is a plain module so the unit
// tests can pin them. The one sentence that is NOT there is the first
// paragraph of the version screen, which main composes because main is the
// only place holding both version numbers.
// ---------------------------------------------------------------------------

/** The Check again button all three screens share. */
function CheckAgainButton({
  label,
  busyLabel
}: {
  label: string;
  busyLabel: string;
}): React.JSX.Element {
  const [checking, setChecking] = useState(false);
  return (
    <div className="empty-actions">
      <button
        type="button"
        className="btn btn-primary"
        disabled={checking}
        onClick={() => {
          setChecking(true);
          void retryBootApp().finally(() => setChecking(false));
        }}
      >
        {checking ? busyLabel : label}
      </button>
    </div>
  );
}

/** A command the user copies and runs themselves. Tortie never runs it. */
function CommandRow({
  command,
  copyLabel
}: {
  command: string;
  copyLabel: string;
}): React.JSX.Element {
  const toast = useApp((s) => s.toast);
  return (
    <div className="empty-actions">
      <span className="code-row">
        {command}
        <button
          type="button"
          className="icon-btn"
          aria-label={copyLabel}
          onClick={() => {
            void navigator.clipboard.writeText(command).then(
              () => toast('info', COPY_COMMAND_TOASTS.ok),
              () => toast('error', COPY_COMMAND_TOASTS.failed)
            );
          }}
        >
          <Codicon name="copy" size={14} />
        </button>
      </span>
    </div>
  );
}

/** §6.4 — a development build with no tmux on this machine. */
export function TmuxMissing(): React.JSX.Element {
  return (
    <div className="empty">
      <div className="empty-inner onb-inner">
        <h2 className="empty-title">{TMUX_MISSING_COPY.title}</h2>
        {TMUX_MISSING_COPY.body.map((line) => (
          <p className="empty-body" key={line}>
            {line}
          </p>
        ))}
        <CommandRow
          command={TMUX_MISSING_COPY.command}
          copyLabel={TMUX_MISSING_COPY.copyLabel}
        />
        <CheckAgainButton
          label={TMUX_MISSING_COPY.button}
          busyLabel={TMUX_MISSING_COPY.buttonBusy}
        />
      </div>
    </div>
  );
}

/**
 * A packaged Tortie whose own copy of tmux is not inside the bundle.
 *
 * There is no command on this screen on purpose. Nothing is missing from the
 * machine, so there is nothing for the user to install, and the only repair is
 * to install Tortie again.
 */
export function TmuxBundleIncomplete(): React.JSX.Element {
  const message = useApp((s) => s.bootBlockMessage);
  const detail = useApp((s) => s.bootErrorDetail);
  return (
    <div className="empty">
      <div className="empty-inner onb-inner boot-block">
        <h2 className="empty-title">{TMUX_BUNDLE_INCOMPLETE_COPY.title}</h2>
        {message !== null ? <p className="empty-body">{message}</p> : null}
        {TMUX_BUNDLE_INCOMPLETE_COPY.body.map((line) => (
          <p className="empty-body" key={line}>
            {line}
          </p>
        ))}
        <CheckAgainButton
          label={TMUX_BUNDLE_INCOMPLETE_COPY.button}
          busyLabel={TMUX_BUNDLE_INCOMPLETE_COPY.buttonBusy}
        />
        {detail !== null ? <p className="boot-block-detail">{detail}</p> : null}
      </div>
    </div>
  );
}

/**
 * A session server that is already running, on a version pair this release
 * never tested, or one whose version could not be read.
 *
 * The command row is the one thing on this screen that could end somebody's
 * work, so it is text the user copies and never a button Tortie presses.
 */
export function TmuxVersionBlocked(): React.JSX.Element {
  const message = useApp((s) => s.bootBlockMessage);
  const detail = useApp((s) => s.bootErrorDetail);
  return (
    <div className="empty">
      <div className="empty-inner onb-inner boot-block">
        <h2 className="empty-title">{TMUX_VERSION_BLOCKED_COPY.title}</h2>
        {message !== null ? <p className="empty-body">{message}</p> : null}
        {TMUX_VERSION_BLOCKED_COPY.body.map((line) => (
          <p className="empty-body" key={line}>
            {line}
          </p>
        ))}
        <ul className="boot-block-ways">
          {TMUX_VERSION_BLOCKED_COPY.ways.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <CommandRow
          command={TMUX_VERSION_BLOCKED_COPY.command}
          copyLabel={TMUX_VERSION_BLOCKED_COPY.copyLabel}
        />
        {TMUX_VERSION_BLOCKED_COPY.afterCommand.map((line) => (
          <p className="empty-body" key={line}>
            {line}
          </p>
        ))}
        <CheckAgainButton
          label={TMUX_VERSION_BLOCKED_COPY.button}
          busyLabel={TMUX_VERSION_BLOCKED_COPY.buttonBusy}
        />
        {detail !== null ? <p className="boot-block-detail">{detail}</p> : null}
      </div>
    </div>
  );
}
