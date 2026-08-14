/**
 * Settings → General (S13): Open at login (moved here from the activity-bar
 * gear's one-item menu) + Default agent (drives the ⌘T picker's initial
 * selection — explicit claude out of the box, never alphabetical).
 */

import React, { useEffect, useState } from 'react';
import type { GmuxLoginItemExtras, GmuxUpdatesExtras, UpdateUiState } from '@shared/ipc';
import type { LaunchableAgentKind } from '@shared/types';
import { keyDisplay } from '@shared/keymap';
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
      </div>

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
