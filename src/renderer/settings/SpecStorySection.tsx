/**
 * Settings → SpecStory (Phase 15, spec: docs/research/13-specstory-integration
 * .md §3.4). Three questions and their answers, in the order a user asks them:
 *
 *   1. Can this Mac capture at all?      the resolved binary, its version, and
 *                                        whether it came with gmux or with brew
 *   2. Which agents start captured?      the per-agent sticky default the ⌘T
 *                                        modal prefills from
 *   3. Where do transcripts end up?      signed in ⇒ the project AND the cloud;
 *                                        signed out ⇒ the project, and nothing
 *                                        else — said once, plainly, not nagged
 *
 * NOT A DASHBOARD (ZEN-OF-TORTIE). Everything here is pulled when the section
 * mounts and when the window comes back to the front — there is no interval,
 * no subscription, and no age that climbs while you watch it. The "last cloud
 * activity" figure is frozen at the moment it was read, because a number that
 * rises on its own is noise in a nicer font, and this one would be rising in a
 * window the user opened to change a setting.
 *
 * ONE HONESTY NOTE ABOUT THAT FIGURE. specstory-cli persists no "last sync"
 * anywhere: `sessions.db` is its LOCAL index (created_at / updated_at /
 * indexed_at, no cloud column) and the sync manager's own `lastSyncTime` never
 * leaves memory. The only durable trace of cloud contact is the refresh
 * token's `lastValidAt`, so that is what this section shows and what it calls
 * it. See src/shared/specstory-status.ts for the full account.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { GmuxSpecStoryExtras } from '@shared/ipc';
import type {
  SpecStoryCaptureAgent,
  SpecStoryStatus
} from '@shared/specstory-status';
import { defaultCaptureAgents } from '@shared/specstory-status';
import { captureDefaultFor } from '@shared/settings';
import type { DetectedAgent, LaunchableAgentId } from '@shared/types';
import { formatAge, truncateMiddle, displayPath } from '../app/format';
import { AgentIcon, Codicon } from '../icons';
import { useSettingsStore } from './settings-store';
import { Switch } from './Switch';
import './specstory.css';

type Bridge = NonNullable<GmuxSpecStoryExtras['specstory']>;

function bridge(): Bridge | null {
  return (
    (window.gmux as (Window['gmux'] & GmuxSpecStoryExtras) | undefined)
      ?.specstory ?? null
  );
}

/** A read of the status, with the instant it was taken (ages freeze here). */
interface Reading {
  status: SpecStoryStatus;
  at: number;
}

const HISTORY_DIR = '.specstory/history';

function formatDay(iso: string): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

/**
 * `https://cloud.specstory.com/cli-login` → `cloud.specstory.com` — the part a
 * person types or recognises. The scheme and path are noise in a caption, and
 * a self-hosted SPECSTORY_CLOUD_URL still shows its own host rather than a
 * production address that would be a lie.
 */
function loginHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

/** "2h ago" / "now", measured at the instant the status was read. */
function formatSince(iso: string, atMs: number): string | null {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const age = formatAge(ms, atMs);
  return age === 'now' ? 'just now' : `${age} ago`;
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

function BinaryRow({ status }: { status: SpecStoryStatus }): React.JSX.Element {
  const binary = status.binary;
  if (binary === null) {
    return (
      <div className="set-row tall">
        <div className="set-row-text">
          <span className="set-row-label">SpecStory isn’t available</span>
          <span className="set-row-caption">
            gmux couldn’t find the SpecStory command, so new sessions can’t be
            captured. Everything else works as usual.
          </span>
        </div>
      </div>
    );
  }
  const shown = displayPath(binary.path);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">
          {binary.version === null ? 'SpecStory' : `SpecStory ${binary.version}`}
        </span>
        <span className="ss-path" title={binary.path}>
          {truncateMiddle(shown, 52)}
        </span>
      </div>
      <span className="set-chip ss-source">
        {binary.source === 'bundled' ? 'bundled with gmux' : 'installed'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-agent capture defaults
// ---------------------------------------------------------------------------

interface CaptureRowProps {
  agent: DetectedAgent;
  on: boolean;
  disabled: boolean;
  onChange: (next: boolean) => void;
}

function CaptureRow({
  agent,
  on,
  disabled,
  onChange
}: CaptureRowProps): React.JSX.Element {
  return (
    <div className="set-row ss-capture-row" data-agent-id={agent.id}>
      <span className="set-agent-icon" aria-hidden="true">
        <AgentIcon agent={agent.iconKey} size={16} />
      </span>
      <span className="set-row-label">{agent.displayName}</span>
      <Switch
        checked={on}
        disabled={disabled}
        label={`Capture ${agent.displayName} sessions by default`}
        onChange={onChange}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cloud account
// ---------------------------------------------------------------------------

interface CloudCardProps {
  reading: Reading;
  onChanged: (status: SpecStoryStatus) => void;
}

type CloudPhase = 'rest' | 'code' | 'confirm-signout';

function CloudCard({ reading, onChanged }: CloudCardProps): React.JSX.Element {
  const { auth, loginUrl } = reading.status;
  const [phase, setPhase] = useState<CloudPhase>('rest');
  const [code, setCode] = useState('');
  const [started, setStarted] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const api = bridge();
  const disabled = api === null || reading.status.binary === null;

  const beginLogin = (): void => {
    setError(null);
    setCode('');
    setStarted(true);
    setPhase('code');
    void api
      ?.beginLogin()
      .then((start) => setStarted(start.opened))
      .catch(() => setStarted(false));
  };

  /**
   * Leaving the code row abandons the sign-in, and abandoning it kills the
   * `specstory login` that is sitting on a pipe waiting for the code. Called
   * from Cancel, from Escape, and from unmount — closing the Settings window
   * mid-sign-in is the commonest way to walk away.
   */
  const abandonLogin = useCallback((): void => {
    void api?.cancelLogin?.().catch(() => undefined);
  }, [api]);

  const cancelLogin = (): void => {
    abandonLogin();
    setPhase('rest');
    setError(null);
  };

  useEffect(() => abandonLogin, [abandonLogin]);

  const submitCode = (): void => {
    if (api === null || busy) return;
    setBusy(true);
    setError(null);
    void api
      .submitCode(code)
      .then((result) => {
        onChanged(result.status);
        if (result.ok) {
          setPhase('rest');
          setCode('');
        } else {
          setError(result.message);
        }
      })
      .catch((err: unknown) => setError((err as Error).message))
      .finally(() => setBusy(false));
  };

  const signOut = (): void => {
    if (api === null || busy) return;
    setBusy(true);
    setError(null);
    void api
      .signOut()
      .then((result) => {
        onChanged(result.status);
        setPhase('rest');
        if (!result.ok) setError(result.message);
      })
      .catch((err: unknown) => setError((err as Error).message))
      .finally(() => setBusy(false));
  };

  const since = auth.since === null ? null : formatDay(auth.since);
  const activity =
    auth.lastCloudActivity === null
      ? null
      : formatSince(auth.lastCloudActivity, reading.at);

  return (
    <div className="set-card">
      <div className="set-row tall">
        <div className="set-row-text">
          <span className="set-row-label">
            {auth.signedIn
              ? `Signed in as ${auth.email ?? 'SpecStory Cloud'}`
              : 'Not signed in'}
          </span>
          {auth.signedIn ? (
            <span className="set-row-caption" title={reading.status.authPath}>
              {[
                since === null ? null : `Since ${since}`,
                activity === null
                  ? null
                  : `last reached SpecStory Cloud ${activity}`
              ]
                .filter((part) => part !== null)
                .join(' · ')}
            </span>
          ) : (
            <span className="set-row-caption">
              {`Captured sessions are saved in each project’s ${HISTORY_DIR}. Nothing is uploaded until you sign in.`}
            </span>
          )}
        </div>

        {auth.signedIn ? (
          phase === 'confirm-signout' ? (
            <div className="ss-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => setPhase('rest')}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-destructive"
                disabled={busy}
                onClick={signOut}
              >
                {busy ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              disabled={disabled || busy}
              onClick={() => setPhase('confirm-signout')}
            >
              Sign out…
            </button>
          )
        ) : phase === 'code' ? null : (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={disabled}
            onClick={beginLogin}
          >
            Sign in
          </button>
        )}
      </div>

      {!auth.signedIn && phase === 'code' ? (
        <div className="set-row tall ss-code-row">
          <div className="set-row-text">
            <span className="set-row-label">Enter the code from your browser</span>
            <span className="set-row-caption">
              {/* The address is in the line because gmux cannot know whether
                  the browser actually opened — the CLI opens it and only
                  warns to a log if it fails. One sentence that works either
                  way beats two that guess. */}
              {started
                ? `Sign in at ${loginHost(loginUrl)} — it shows a 6-character code.`
                : 'gmux couldn’t start SpecStory sign-in. Check the SpecStory command above, then try again.'}
            </span>
          </div>
          <div className="ss-actions">
            <input
              className="ss-code-field"
              aria-label="Device code"
              autoFocus
              spellCheck={false}
              autoComplete="off"
              maxLength={7}
              placeholder="Ab1-c23"
              value={code}
              disabled={busy}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCode();
                if (e.key === 'Escape') cancelLogin();
              }}
            />
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || code.trim().length < 6}
              onClick={submitCode}
            >
              {busy ? (
                <>
                  <span className="set-spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={cancelLogin}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error !== null ? (
        <div className="set-row ss-error-row">
          <span className="set-row-error" role="alert">
            {error}
          </span>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// The section
// ---------------------------------------------------------------------------

export function SpecStorySection(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const scan = useSettingsStore((s) => s.scan);
  const [reading, setReading] = useState<Reading | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback((refresh: boolean): void => {
    const api = bridge();
    if (api === null) {
      setUnavailable(true);
      return;
    }
    void api
      .status(refresh)
      .then((status) => setReading({ status, at: Date.now() }))
      .catch(() => setUnavailable(true));
  }, []);

  // On mount, and again when the window returns to the front — a sign-in done
  // in a terminal is exactly the change this section must not miss, and focus
  // is the moment the user is looking at it. No timer: see the file header.
  useEffect(() => {
    load(false);
    const onFocus = (): void => load(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  const captureAgents: SpecStoryCaptureAgent[] =
    reading?.status.captureAgents ?? defaultCaptureAgents();
  const capturable = new Set(captureAgents.map((a) => a.agentId as string));
  const rows = (scan?.agents ?? []).filter(
    (a) => capturable.has(a.id) && a.installed
  );
  const captureDisabled = reading === null || reading.status.binary === null;

  const setCaptureDefault = (agentId: string, on: boolean): void => {
    const next = { ...settings.captureDefaults };
    if (on) next[agentId as LaunchableAgentId] = true;
    else delete next[agentId as LaunchableAgentId];
    void update({ captureDefaults: next });
  };

  if (unavailable) {
    return (
      <section aria-label="SpecStory">
        <h1 className="set-title">SpecStory</h1>
        <div className="set-card">
          <div className="set-empty-line">
            This build can’t report on SpecStory — quit and reopen gmux; if it
            keeps happening, reinstall it.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="SpecStory">
      <h1 className="set-title">SpecStory</h1>
      <p className="set-section-caption">
        SpecStory saves an agent session’s conversation as markdown in the
        project it ran in, and syncs it to SpecStory Cloud when you’re signed
        in.
      </p>

      <div className="set-card">
        {reading === null ? (
          <div className="set-empty-line">Looking for SpecStory…</div>
        ) : (
          <BinaryRow status={reading.status} />
        )}
      </div>

      {/* The account comes BEFORE the per-agent list on purpose: signing in is
          the only thing in this section a user might need to DO, and the list
          below runs to seven rows on a machine with seven agents — enough to
          push [Sign in] off the bottom of a 560px-tall window. */}
      <div className="set-group-label">SpecStory Cloud</div>
      {reading === null ? (
        <div className="set-card">
          <div className="set-empty-line">Checking your account…</div>
        </div>
      ) : (
        <CloudCard
          reading={reading}
          onChanged={(status) => setReading({ status, at: Date.now() })}
        />
      )}
      {/* Only while signed OUT: it explains the button that is on screen. A
          standing reassurance under an account you already have is noise. */}
      {reading !== null && !reading.status.auth.signedIn ? (
        <p className="ss-note">
          <Codicon name="info" size={12} className="ss-note-icon" />
          Signing in opens SpecStory Cloud in your browser and asks for the code
          it shows you. gmux never sees your password.
        </p>
      ) : null}

      <div className="set-group-label">Capture new sessions</div>
      <div className="set-card">
        {scan === null ? (
          <div className="set-empty-line">Looking for installed agents…</div>
        ) : rows.length === 0 ? (
          <div className="set-empty-line">
            None of the agents SpecStory can capture are installed here.
          </div>
        ) : (
          rows.map((agent) => (
            <CaptureRow
              key={agent.id}
              agent={agent}
              // Through the shared helper, not `=== true` written again here:
              // it is the one place "no stored answer means OFF" is decided,
              // and this switch must read the same rule the ⌘T sheet prefills
              // from and main's create path obeys.
              on={captureDefaultFor(settings, agent.id)}
              disabled={captureDisabled}
              onChange={(next) => setCaptureDefault(agent.id, next)}
            />
          ))
        )}
      </div>
      <p className="ss-note">
        {`These are starting points: creating a session shows the same switch, and
        the choice you make there is remembered here. Capture writes to `}
        <code>{HISTORY_DIR}</code>
        {` inside the project — worth a line in .gitignore if your team doesn’t
        keep transcripts. Shell sessions are never captured.`}
      </p>
    </section>
  );
}
