/**
 * Settings → General (S13): Open at login (moved here from the activity-bar
 * gear's one-item menu) + Default agent (drives the ⌘T picker's initial
 * selection — explicit claude out of the box, never alphabetical).
 */

import React, { useEffect, useState } from 'react';
import type { GmuxLoginItemExtras } from '@shared/ipc';
import type { LaunchableAgentKind } from '@shared/types';
import { keyDisplay } from '@shared/keymap';
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
          gmux starts in the background so sessions are ready instantly.
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
    </section>
  );
}
