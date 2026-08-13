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
import {
  agentInstallCommand,
  buildAgentOptions,
  defaultAgentChoice,
  useAgentAvailability,
  type AgentPickerOption
} from '../state/agents';
import { useSettingsStore } from '../settings/settings-store';
import { cloneAction } from '../state/clone';
// Phase 12.12 item 1: the fleet board is a shared component now — the ⌘T
// sheet renders the identical tiles from ./AgentGrid.
import { AgentGrid } from './AgentGrid';
import { Codicon } from '../icons';
import { HomeScreen } from './HomeScreen';
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

export function NoSessions(): React.JSX.Element {
  const quickCreate = useApp((s) => s.quickCreate);
  const project = useApp((s) => s.activeProject());
  const avail = useAgentAvailability();
  // Same settings truth as the ⌘T modal and the Settings window: the agent
  // detection scan (installed / early-support) and the recorded hotkeys.
  const initSettings = useSettingsStore((s) => s.init);
  const scan = useSettingsStore((s) => s.scan);
  const hotkeys = useSettingsStore((s) => s.settings.hotkeys);
  const defaultAgent = useSettingsStore((s) => s.settings.defaultAgent);
  useEffect(() => {
    initSettings();
  }, [initSettings]);

  const options = useMemo(() => buildAgentOptions(scan, avail), [scan, avail]);
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
  const hintedCmd = hinted !== null ? agentInstallCommand(hinted.id) : null;

  return (
    <div className="empty">
      <div className="empty-inner onb-inner">
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
        />

        <p className="onb-hint">
          Click one to start it in{' '}
          <span className="onb-hint-strong">
            {project?.name ?? 'this project'}
          </span>
          , or press <span className="key">{keyDisplay('session.new')}</span> to
          name it and pick a
          directory.
        </p>

        <div className="onb-caption" aria-live="polite">
          {hinted !== null ? (
            <>
              <span className="agent-missing-text">
                {hintedCmd !== null
                  ? `${hinted.label} isn’t installed. Install it with`
                  : `${hinted.label} isn’t installed — Tortie picks it up as soon as it’s on your PATH.`}
              </span>
              {hintedCmd !== null ? (
                // The ⌘T modal carries the copy affordance for this command;
                // here it is selectable text, so the state stays quiet.
                <code className="agent-missing-cmd">{hintedCmd}</code>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// §6.4 — tmux missing (the ONLY surface where the word tmux may appear)
// ---------------------------------------------------------------------------

const INSTALL_CMD = 'brew install tmux';

export function TmuxMissing(): React.JSX.Element {
  const retryBoot = useApp((s) => s.retryBoot);
  const toast = useApp((s) => s.toast);
  const [checking, setChecking] = useState(false);

  return (
    <div className="empty">
      <div className="empty-inner onb-inner">
        <h2 className="empty-title">Tortie needs tmux to keep sessions alive</h2>
        <p className="empty-body">
          Tortie runs sessions on a private tmux server so they survive quits
          and crashes. It never touches your own tmux setup.
        </p>
        <div className="empty-actions">
          <span className="code-row">
            {INSTALL_CMD}
            <button
              type="button"
              className="icon-btn"
              aria-label="Copy install command"
              onClick={() => {
                void navigator.clipboard.writeText(INSTALL_CMD).then(
                  () => toast('info', 'Command copied'),
                  () => toast('error', 'Could not copy the command')
                );
              }}
            >
              <Codicon name="copy" size={14} />
            </button>
          </span>
        </div>
        <div className="empty-actions">
          <button
            type="button"
            className="btn btn-primary"
            disabled={checking}
            onClick={() => {
              setChecking(true);
              void retryBoot().finally(() => setChecking(false));
            }}
          >
            {checking ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </div>
    </div>
  );
}
