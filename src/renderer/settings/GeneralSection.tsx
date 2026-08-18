/**
 * Settings → General (S13): Open at login (moved here from the activity-bar
 * gear's one-item menu) + Default agent (drives the ⌘T picker's initial
 * selection — explicit claude out of the box, never alphabetical) + where the
 * eye lands after a session leaves a split (Phase 86).
 */

import React, { useEffect, useState } from 'react';
import type {
  GmuxLoginItemExtras,
  GmuxShellExtras,
  GmuxUpdatesExtras,
  ShellCommandStatus,
  UpdateUiState
} from '@shared/ipc';
import type { LaunchableAgentKind } from '@shared/types';
import { keyDisplay } from '@shared/keymap';
import {
  DEFAULT_POP_OUT_FOCUS,
  readPopOutFocus,
  writePopOutFocus
} from '../state/pop-out-focus';
import type { PopOutFocus } from '../state/pop-out-focus';
import { ScrollbackSection } from './ScrollbackSection';
import { useSettingsStore } from './settings-store';
import { Switch } from './Switch';

function loginBridge(): GmuxLoginItemExtras {
  return (window.gmux ?? {}) as unknown as GmuxLoginItemExtras;
}

function LoginItemRow(): React.JSX.Element | null {
  const [on, setOn] = useState<boolean | null>(null); // null = loading
  const [error, setError] = useState<string | null>(null);
  const extras = loginBridge();
  const supported =
    typeof extras.getLoginItem === 'function' &&
    typeof extras.setLoginItem === 'function';

  useEffect(() => {
    if (!supported) return;
    let alive = true;
    void extras
      .getLoginItem?.()
      .then((r) => {
        if (alive) setOn(r.openAtLogin);
      })
      .catch(() => {
        if (alive) setOn(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  if (!supported) return null;

  const toggle = (next: boolean): void => {
    setError(null);
    setOn(next); // optimistic; readback corrects
    void extras
      .setLoginItem?.(next)
      .then((r) => {
        // Render the OS READBACK, not the request (System Settings can veto).
        setOn(r.openAtLogin);
        if (r.openAtLogin !== next) {
          setError(
            'macOS declined the change — check System Settings › General › Login Items.'
          );
        }
      })
      .catch((err: unknown) => {
        setOn(!next);
        setError((err as Error).message);
      });
  };

  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">Open at login</span>
        <span className="set-row-caption">
          Tortie starts in the background so sessions are ready instantly.
        </span>
        {error !== null ? <span className="set-row-error">{error}</span> : null}
      </div>
      <Switch
        checked={on === true}
        disabled={on === null}
        label="Open at login"
        onChange={toggle}
      />
    </div>
  );
}

/**
 * Phase 51. The `tortie` shell command: one card, one explicit Install
 * click, one explicit Remove click. The row shows the exact target path
 * BEFORE the click, which is the charter's "shown to the user before
 * writing". The command opens a folder and does nothing else — the copy
 * says so, and the shim itself refuses every flag.
 */
function ShellCommandRow(): React.JSX.Element | null {
  const [status, setStatus] = useState<ShellCommandStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const extras = (window.gmux ?? {}) as unknown as GmuxShellExtras;
  const supported =
    typeof extras.shellCommandStatus === 'function' &&
    typeof extras.installShellCommand === 'function' &&
    typeof extras.removeShellCommand === 'function';

  useEffect(() => {
    if (!supported) return;
    let alive = true;
    void extras
      .shellCommandStatus?.()
      .then((s) => {
        if (alive) setStatus(s);
      })
      .catch(() => {
        // An unanswerable read renders no row rather than a wrong one.
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  if (!supported || status === null) return null;

  /** Strip Electron's invoke prefix so the row shows the plain sentence. */
  const friendly = (err: unknown): string =>
    (err instanceof Error ? err.message : String(err)).replace(
      /^Error invoking remote method '[^']+': (?:Error: )?/,
      ''
    );

  const run = (
    act: (() => Promise<ShellCommandStatus>) | undefined
  ): void => {
    if (act === undefined) return;
    setBusy(true);
    setError(null);
    void act()
      .then((s) => setStatus(s))
      .catch((err: unknown) => setError(friendly(err)))
      .finally(() => setBusy(false));
  };

  const target = status.target ?? '';
  let caption: string;
  let targetLine: string | null = null;
  let button: { label: string; act: (() => Promise<ShellCommandStatus>) | undefined } | null = null;
  if (status.state === 'not-installed') {
    caption =
      'Install the tortie command to open folders from a terminal. ' +
      'Typing tortie . opens the current folder as a project tab in the ' +
      'running Tortie window. The command opens a folder and does nothing ' +
      'else. It cannot start an agent, and it accepts no flags.';
    targetLine = `The command will be written to ${target}.`;
    button = { label: 'Install', act: extras.installShellCommand };
  } else if (status.state === 'installed') {
    caption =
      `The tortie command is installed at ${target}. Typing tortie . in a ` +
      'terminal opens the current folder as a project tab. The command ' +
      'opens a folder and does nothing else.';
    button = { label: 'Remove', act: extras.removeShellCommand };
  } else if (status.state === 'foreign') {
    caption =
      `A file named tortie already exists at ${target} and Tortie did not ` +
      'install it, so Tortie will not replace it or remove it.';
  } else {
    caption =
      'The command cannot be installed. Tortie looked for a folder that ' +
      'is both on your PATH and writable, among /opt/homebrew/bin, ' +
      '/usr/local/bin and ~/.local/bin, and found none.';
  }

  return (
    <>
      <div className="set-group-label">Shell command</div>
      <div className="set-card">
        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">Shell command</span>
            <span className="set-row-caption">{caption}</span>
            {targetLine !== null ? (
              <span className="set-row-caption">{targetLine}</span>
            ) : null}
            {error !== null ? (
              <span className="set-row-error">{error}</span>
            ) : null}
          </div>
          {button !== null ? (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={() => run(button?.act)}
            >
              {button.label}
            </button>
          ) : null}
        </div>
      </div>
    </>
  );
}

function DefaultAgentRow(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const scan = useSettingsStore((s) => s.scan);

  // Installed launchable agents + Shell; the persisted choice stays listed
  // even if its CLI vanished (so the row never lies about the stored value).
  const options: { id: string; label: string }[] = [];
  for (const a of scan?.agents ?? []) {
    if (!a.launchable) continue;
    if (a.installed || a.id === settings.defaultAgent) {
      options.push({ id: a.id, label: a.displayName });
    }
  }
  if (options.length === 0) {
    options.push({ id: 'claude', label: 'Claude Code' });
  }
  options.push({ id: 'shell', label: 'Shell' });

  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">Default agent</span>
        <span className="set-row-caption">
          {`Preselected when you create a session (${keyDisplay('session.new')}).`}
        </span>
      </div>
      <select
        className="set-select"
        aria-label="Default agent"
        value={settings.defaultAgent}
        onChange={(e) => {
          void update({
            defaultAgent: e.target.value as LaunchableAgentKind
          });
        }}
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Phase 86. Where the eye lands after a session is dragged out of a split.
 * The two answers in plain words: Tortie either shows you the session you
 * dragged out, or keeps you looking at the split you dragged it from. The
 * first answer is what the app has always done and it stays the default.
 *
 * The value is a localStorage key rather than a settings-file field, because
 * it is presentation state that belongs beside the layout record it acts on.
 * The reasons are written out in `src/renderer/state/pop-out-focus.ts`. The
 * row reads the stored answer once on mount and writes it on every change,
 * and the main window reads it fresh on the next pop out.
 */
function PopOutFocusRow(): React.JSX.Element {
  const [value, setValue] = useState<PopOutFocus>(DEFAULT_POP_OUT_FOCUS);

  useEffect(() => {
    setValue(readPopOutFocus());
  }, []);

  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">After a session leaves a split</span>
        <span className="set-row-caption">
          Choose where you are looking after you drag a session out of a split
          and into its own tab.
        </span>
      </div>
      <select
        className="set-select"
        aria-label="After a session leaves a split"
        value={value}
        onChange={(e) => {
          const next = e.target.value as PopOutFocus;
          setValue(next);
          writePopOutFocus(next);
        }}
      >
        <option value="moved">Show me the session I moved</option>
        <option value="stayed">Keep me on the split it came from</option>
      </select>
    </div>
  );
}

/**
 * Phase 24. One read only row: the running version, and what the updater is
 * doing about it. Data comes from the `updates:state` invoke channel, fetched
 * when the section mounts. The row does not live update; reopening Settings
 * refreshes it, which is a recorded limit of the phase rather than a defect.
 * There is no button here: checking is in the Tortie menu, and installing
 * rides the user's own quit.
 */
function UpdatesGroup(): React.JSX.Element | null {
  const [state, setState] = useState<UpdateUiState | null>(null);
  const extras = (window.gmux ?? {}) as unknown as GmuxUpdatesExtras;
  const supported = typeof extras.updates?.state === 'function';

  useEffect(() => {
    if (!supported) return;
    let alive = true;
    void extras.updates
      ?.state()
      .then((s) => {
        if (alive) setState(s);
      })
      .catch(() => {
        // An unanswerable read renders no row rather than a wrong one.
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  if (!supported || state === null) return null;

  const caption =
    state.stagedVersion !== null
      ? `Version ${state.currentVersion}. Tortie ${state.stagedVersion} is ready and installs when you quit.`
      : state.lastCheckedAt !== null
        ? `Version ${state.currentVersion}. Last checked ${new Date(state.lastCheckedAt).toLocaleString()}.`
        : `Version ${state.currentVersion}. No update check has run yet.`;

  return (
    <>
      <div className="set-group-label">Updates</div>
      <div className="set-card">
        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">Updates</span>
            <span className="set-row-caption">{caption}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export function GeneralSection(): React.JSX.Element {
  return (
    <section aria-label="General">
      <h1 className="set-title">General</h1>

      <div className="set-group-label">Startup</div>
      <div className="set-card">
        <LoginItemRow />
      </div>

      <div className="set-group-label">Sessions</div>
      <div className="set-card">
        <DefaultAgentRow />
        <PopOutFocusRow />
      </div>

      {/* Phase 51. The tortie shell command: install and remove are the two
          only writers, each one explicit click, and the target path is on
          the card before the click. Feature-detected: an older preload
          renders no card. */}
      <ShellCommandRow />

      {/* Phase 13.7. A third GROUP, not a fourth nav section: the one figure
          this feature shows is evidence for the choice being made in this
          card, and a nav item called Diagnostics is a dashboard by another
          name (ZEN-OF-TORTIE). */}
      <ScrollbackSection />

      {/* Phase 24. The bottom of General, per the phase spec: one line about
          the running version and the staged update, no controls. */}
      <UpdatesGroup />
    </section>
  );
}
