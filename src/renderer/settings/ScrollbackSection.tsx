/**
 * Settings → General → SCROLLBACK (Phase 13.7, spec:
 * docs/research/23-scrollback-limits.md §4-5).
 *
 * TWO CONTROLS AND ONE SENTENCE. That sentence is the entire "diagnostics
 * panel" this phase ships, and it lives HERE rather than in a section of its
 * own because a nav item called Diagnostics is a dashboard by another name.
 * It appears only while Settings is open, it is evidence for a decision the
 * user is actively making, and it contains no number that rises on its own.
 *
 * The two depths are INDEPENDENT and the copy has to keep them apart:
 *
 *   Scrollback depth   what a session KEEPS — how far scrolling and capture
 *                      can reach. tmux's `history-limit`, fixed when the
 *                      session starts.
 *   Saved scrollback   what COMES BACK after a restart. The lines written
 *                      into the reboot snapshot at quit.
 *
 * Saving less does not shorten what you can scroll back through, and there is
 * no hidden third cap: the terminal's own scrollback setting was measured
 * INERT (every gmux pane lives in xterm's alternate buffer, which has no
 * scrollback by construction), so it is deliberately not offered here. A
 * placebo lever is the worst thing to teach a user in a product whose
 * philosophy is "hide the machinery".
 *
 * Every estimate is computed from the USER'S OWN output, never hardcoded, and
 * always reads "about" — the underlying rate spans 114× across content types
 * and ±4× across two real sessions on the same machine on the same day.
 */

import React, { useEffect, useMemo, useState } from 'react';
import type { ScrollbackStats } from '@shared/scrollback';
import {
  bytesPerLine,
  estimateSessionBytes,
  formatScrollbackBytes
} from '@shared/scrollback';
import {
  MAX_SAVED_SCROLLBACK_LINES,
  MAX_SCROLLBACK_LINES,
  MIN_SAVED_SCROLLBACK_LINES,
  MIN_SCROLLBACK_LINES,
  clampSavedScrollbackLines,
  clampScrollbackLines
} from '@shared/settings';
import { useSettingsStore } from './settings-store';
import './scrollback.css';
import type { InstalledGmuxApi } from '@shared/ipc';
import { gmuxBridge } from '../bridge';

const DEPTH_PRESETS = [10_000, 25_000, 50_000] as const;
const SAVED_PRESETS = [2_000, 10_000, 25_000] as const;
const CUSTOM = 'custom';

function bridge(): NonNullable<InstalledGmuxApi['scrollback']> | null {
  return gmuxBridge()?.scrollback ?? null;
}

const lines = (n: number): string => `${n.toLocaleString()} lines`;

// ---------------------------------------------------------------------------
// A depth control: preset dropdown, plus a field when the value is not one
// ---------------------------------------------------------------------------

interface DepthControlProps {
  label: string;
  value: number;
  presets: readonly number[];
  min: number;
  max: number;
  onCommit: (value: number) => void;
}

/**
 * The field appears only once the user has asked for a number the presets do
 * not offer, and it stays visible for a stored value that is not a preset —
 * so the control can never show a round number the product is not using.
 *
 * The draft is local text, committed on blur or Enter. Clamping per keystroke
 * would rewrite "1" into "1,000" under the cursor the moment the field was
 * cleared, which is how a number field becomes unusable.
 */
function DepthControl({
  label,
  value,
  presets,
  min,
  max,
  onCommit
}: DepthControlProps): React.JSX.Element {
  const isPreset = presets.includes(value);
  const [custom, setCustom] = useState(!isPreset);
  const [draft, setDraft] = useState(String(value));

  // Re-derive on every value change, in BOTH directions. Only closing the
  // field when the value became a preset left the other case broken: lowering
  // Scrollback depth below 2,000 clamps Saved scrollback down with it, and a
  // `<select>` whose value matches no option silently renders its FIRST one —
  // so the row would have shown "2,000 lines" while holding something else.
  useEffect(() => {
    setDraft(String(value));
    setCustom(!presets.includes(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, presets.join(',')]);

  const commitDraft = (): void => {
    const parsed = Number(draft.replace(/[^0-9]/g, ''));
    const next = Number.isFinite(parsed) && parsed > 0 ? parsed : value;
    onCommit(next);
    setDraft(String(Math.min(max, Math.max(min, Math.round(next)))));
  };

  return (
    <div className="set-depth">
      <select
        className="set-select"
        aria-label={label}
        value={custom ? CUSTOM : String(value)}
        onChange={(e) => {
          if (e.target.value === CUSTOM) {
            setCustom(true);
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLInputElement>(`[data-depth="${label}"]`)
                ?.select()
            );
            return;
          }
          setCustom(false);
          onCommit(Number(e.target.value));
        }}
      >
        {presets.map((p) => (
          <option key={p} value={String(p)}>
            {lines(p)}
          </option>
        ))}
        <option value={CUSTOM}>Custom…</option>
      </select>
      {custom ? (
        <input
          className="set-depth-field"
          type="number"
          data-depth={label}
          aria-label={`${label}, lines`}
          min={min}
          max={max}
          step={1_000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitDraft();
          }}
        />
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function ScrollbackSection(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const [stats, setStats] = useState<ScrollbackStats | null>(null);
  const [copied, setCopied] = useState(false);

  // ON DEMAND, once, when Settings opens. There is no interval here and no
  // refetch on focus: the figures below are evidence for a choice, not a
  // readout, and the Settings window is a separate renderer that executes
  // none of this while it is closed.
  useEffect(() => {
    let alive = true;
    void bridge()
      ?.stats()
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  const perLine = stats?.perLine ?? bytesPerLine([]);
  const depth = settings.scrollbackLines;
  const saved = settings.savedScrollbackLines;
  const savedMax = Math.min(MAX_SAVED_SCROLLBACK_LINES, depth);

  const perSession = useMemo(
    () => formatScrollbackBytes(estimateSessionBytes(depth, perLine)),
    [depth, perLine]
  );

  // What the estimate is BASED on, said plainly. An estimate that cannot name
  // its source reads as a guarantee, and this one carries ±4×.
  const basis = perLine.estimated
    ? 'based on typical agent output'
    : 'based on what your sessions produce now';

  const savedNote =
    stats === null
      ? null
      : stats.saved.files === 0
        ? 'Nothing has been saved yet — sessions are saved when you quit.'
        : `Your saved sessions use ${formatScrollbackBytes(stats.saved.bytes)}.`;

  const copyDetails = (): void => {
    const api = bridge();
    if (api === null) return;
    void api
      .report()
      .then((text) => navigator.clipboard.writeText(text))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2_000);
      })
      .catch(() => undefined);
  };

  return (
    <>
      <div className="set-group-label">Scrollback</div>
      <div className="set-card">
        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">Scrollback depth</span>
            <span className="set-row-caption">
              How much output each session keeps, and how far back you can
              scroll through it.
            </span>
            <span className="set-row-estimate">
              {`About ${perSession} per session at this depth, ${basis}.`}
            </span>
          </div>
          <DepthControl
            label="Scrollback depth"
            value={depth}
            presets={DEPTH_PRESETS}
            min={MIN_SCROLLBACK_LINES}
            max={MAX_SCROLLBACK_LINES}
            onCommit={(next) => {
              const value = clampScrollbackLines(next);
              void update({
                scrollbackLines: value,
                savedScrollbackLines: clampSavedScrollbackLines(saved, value)
              });
            }}
          />
        </div>

        <div className="set-row tall">
          <div className="set-row-text">
            <span className="set-row-label">Saved scrollback</span>
            <span className="set-row-caption">
              How much of a session comes back after a restart.
              {saved > 10_000
                ? ' At this depth, quitting takes a little longer while sessions are saved.'
                : ''}
            </span>
            {savedNote === null ? null : (
              <span className="set-row-estimate">{savedNote}</span>
            )}
          </div>
          <DepthControl
            label="Saved scrollback"
            value={saved}
            presets={SAVED_PRESETS.filter((p) => p <= savedMax)}
            min={MIN_SAVED_SCROLLBACK_LINES}
            max={savedMax}
            onCommit={(next) => {
              void update({
                savedScrollbackLines: clampSavedScrollbackLines(next, depth)
              });
            }}
          />
        </div>

        {stats === null ? null : (
          <div className="set-row set-scrollback-total">
            <span className="set-row-caption">
              {stats.sessions === 0
                ? 'No sessions are running, so nothing is being held.'
                : `Your sessions are holding ${formatScrollbackBytes(stats.bytes)} of scrollback.`}
            </span>
            <button type="button" className="btn btn-text" onClick={copyDetails}>
              {copied ? 'Copied' : 'Copy details'}
            </button>
          </div>
        )}
      </div>
      <p className="set-note">
        Both depths apply to sessions you start from now on. A session already
        running keeps the depth it started with — ending it and starting it
        again is the only way to change that. The two are independent: what a
        session saves never changes how far back you can scroll. Clearing a
        session frees its scrollback immediately.
      </p>
    </>
  );
}
