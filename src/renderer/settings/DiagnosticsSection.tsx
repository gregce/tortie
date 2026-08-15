/**
 * Settings → Diagnostics (Phase 35, spec: docs/research/42-logging.md).
 *
 * Three affordances and nothing else: a runtime debug switch, the logs
 * folder, and the Copy diagnostics report. This is NOT a dashboard
 * (ZEN-OF-TORTIE): nothing here is a reading, nothing refreshes on its own,
 * and no number climbs while you watch it. Every control is an action a
 * person takes when something already went wrong.
 *
 * The switch is deliberately not persisted. Debug level is a magnifying
 * glass you pick up for one bad session, and a sticky debug level would
 * quietly triple the write rate forever. Main resets to info at the next
 * launch, and the caption says so in plain words.
 *
 * The whole section pulls once, when it opens (the ScrollbackSection
 * pattern): the level read is evidence for the switch position, not a feed.
 * Everything travels over the five typed log:* channels; the plain-text
 * report is BUILT in main (src/main/log/diagnostics.ts), already redacted,
 * so what lands on the clipboard is exactly what a hand export may contain.
 */

import React, { useEffect, useState } from 'react';
import type { GmuxLogExtras, LogLevel } from '@shared/ipc';
import { Switch } from './Switch';
import './diagnostics.css';

function bridge(): NonNullable<GmuxLogExtras['log']> | null {
  return (
    (window.gmux as (Window['gmux'] & GmuxLogExtras) | undefined)?.log ?? null
  );
}

export function DiagnosticsSection(): React.JSX.Element {
  const [level, setLevel] = useState<LogLevel | null>(null);
  const [copied, setCopied] = useState(false);
  const supported = bridge() !== null;

  // ON DEMAND, once, when the section opens. The value can only change from
  // this window, so there is nothing to subscribe to.
  useEffect(() => {
    if (!supported) return;
    let alive = true;
    void bridge()
      ?.level()
      .then((l) => {
        if (alive) setLevel(l);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [supported]);

  const flipDebug = (next: boolean): void => {
    const api = bridge();
    if (api === null) return;
    const target: LogLevel = next ? 'debug' : 'info';
    setLevel(target); // optimistic; a failed switch re-reads the truth
    void api.setLevel(target).catch(() => {
      void api
        .level()
        .then((l) => setLevel(l))
        .catch(() => setLevel(null));
    });
  };

  const openFolder = (): void => {
    void bridge()
      ?.openFolder()
      .catch(() => undefined);
  };

  const copyDiagnostics = (): void => {
    const api = bridge();
    if (api === null) return;
    void api
      .diagnostics()
      .then((text) => navigator.clipboard.writeText(text))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2_000);
      })
      .catch(() => undefined);
  };

  if (!supported) {
    return (
      <section aria-label="Diagnostics">
        <h1 className="set-title">Diagnostics</h1>
        <div className="set-card">
          <div className="set-empty-line">
            Logs are not available in this build.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Diagnostics">
      <h1 className="set-title">Diagnostics</h1>

      <div className="set-group-label">Logging</div>
      <div className="set-card">
        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">Debug logging</span>
            <span className="set-row-caption">
              Writes extra detail to the log until Tortie quits. It turns
              itself off at the next launch.
            </span>
          </div>
          <Switch
            checked={level === 'debug'}
            disabled={level === null}
            label="Debug logging"
            onChange={flipDebug}
          />
        </div>

        <div className="set-row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={openFolder}
          >
            Open logs folder
          </button>
        </div>

        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-caption">
              Copies a plain text report: the boot snapshot, the recent log
              lines, and the crash dump list. You can read every line before
              you share it.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary set-diag-copy"
            onClick={copyDiagnostics}
          >
            {copied ? 'Copied' : 'Copy diagnostics'}
          </button>
        </div>
      </div>
    </section>
  );
}
