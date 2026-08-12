/**
 * Settings → SpecStory (Phase 15, spec: docs/research/13-specstory-integration
 * .md §3.4). Three questions and their answers, in the order a user asks them:
 *
 *   1. Can this Mac capture at all?      the resolved binary, its version, and
 *                                        whether it came with Tortie or brew
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
 *
 * PHASE 18.5 — THREE THINGS THIS SECTION USED TO KNOW AND NOT SAY
 * (spec: docs/research/30-specstory-distribution.md §3.1 and §4.7).
 *
 *   1. There can be more than one specstory on a Mac, at different versions,
 *      and only one of them runs. This section now names the one that runs and
 *      lists the others, because it is the only place a user can see that.
 *   2. `captureSupportFor()` already computes WHY an agent cannot be captured
 *      here. The list used to drop that answer and drop the agent with it, so
 *      an absent row looked like a bug. A blocked agent now gets its row, with
 *      its switch off and the reason under its name.
 *   3. The provider probe is cached for the whole app run, so upgrading
 *      specstory in a terminal left this list stale until Tortie restarted.
 *      The Re-check button asks again.
 *
 * STILL NOT A DASHBOARD. Re-check is a button a person presses, not a timer,
 * and nothing added here counts or climbs.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { GmuxSpecStoryExtras } from '@shared/ipc';
import type {
  SpecStoryBinaryInfo,
  SpecStoryCaptureAgent,
  SpecStoryCaptureBlocked,
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
            Tortie couldn’t find the SpecStory command, so new sessions can’t
            be captured. Everything else works as usual.
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
        {binary.source === 'bundled' ? 'bundled with Tortie' : 'installed'}
      </span>
    </div>
  );
}

/** Why the copy above is the one that runs. Today's rule, not a guess at it. */
function chosenBecause(binary: SpecStoryBinaryInfo): string {
  return binary.source === 'bundled'
    ? 'Tortie uses the copy it ships with, so a capture runs the version this build was tested against.'
    : 'Tortie uses the copy it found on your PATH.';
}

/**
 * The copies that did NOT win.
 *
 * A second specstory is not a fault and this row does not treat it as one. It
 * is here because the versions can differ, a provider can exist in one and not
 * the other, and until now this section showed one path and implied it was the
 * only one on the machine.
 */
function OtherBinariesRow({
  status
}: {
  status: SpecStoryStatus;
}): React.JSX.Element | null {
  const others = status.otherBinaries;
  const active = status.binary;
  if (others.length === 0 || active === null) return null;
  return (
    <div className="set-row tall ss-others">
      <div className="set-row-text">
        <span className="set-row-label muted">
          {others.length === 1
            ? 'One other copy on this Mac'
            : `${others.length} other copies on this Mac`}
        </span>
        {others.map((other) => (
          <span key={other.path} className="ss-path" title={other.path}>
            {`${other.version ?? 'version unknown'} · ${truncateMiddle(displayPath(other.path), 46)}`}
          </span>
        ))}
        <span className="set-row-caption">{chosenBecause(active)}</span>
      </div>
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
  /** One line under the name. Null keeps the row on one line, as before. */
  note?: string | null;
  /** Draw as unavailable rather than merely switched off. */
  blocked?: boolean;
  onChange: (next: boolean) => void;
}

function CaptureRow({
  agent,
  on,
  disabled,
  note = null,
  blocked = false,
  onChange
}: CaptureRowProps): React.JSX.Element {
  const label = <span className="set-row-label">{agent.displayName}</span>;
  return (
    <div
      className={`set-row ss-capture-row${note === null ? '' : ' tall'}${blocked ? ' blocked' : ''}`}
      data-agent-id={agent.id}
    >
      <span className="set-agent-icon" aria-hidden="true">
        <AgentIcon agent={agent.iconKey} size={16} />
      </span>
      {note === null ? (
        label
      ) : (
        <div className="set-row-text">
          {label}
          <span className="set-row-caption">{note}</span>
        </div>
      )}
      <Switch
        checked={on}
        disabled={disabled}
        label={`Capture ${agent.displayName} sessions by default`}
        onChange={onChange}
      />
    </div>
  );
}

/**
 * The sentence for an agent this Mac cannot capture, in the user's terms.
 *
 * `no-binary` returns null on purpose. When there is no specstory at all the
 * card at the top of the section has already said so once, and repeating it
 * on every row would be the same news six times.
 */
function blockedNote(
  blocked: SpecStoryCaptureBlocked,
  agent: DetectedAgent,
  binary: SpecStoryBinaryInfo | null
): string | null {
  switch (blocked.reason) {
    case 'no-binary':
      return null;
    case 'no-provider-for-agent':
      return `Tortie can’t capture ${agent.displayName} with SpecStory yet.`;
    case 'provider-missing-from-cli':
      return binary === null || binary.version === null
        ? `This copy of SpecStory can’t capture ${agent.displayName} yet.`
        : `SpecStory ${binary.version} can’t capture ${agent.displayName} yet.`;
    default:
      return null;
  }
}

/**
 * A provider the binary reports that Tortie has never measured (research
 * §3.5). Capture works. What its exit code means does not, and the death
 * report reads that number, so the row says which half is unverified.
 */
const DISCOVERED_NOTE =
  'New in this version of SpecStory. Capture works, but Tortie hasn’t measured how it reports exit codes.';

/** That note, for a capture entry that carries the flag. Null for the rest. */
function discoveredNote(entry: SpecStoryCaptureAgent | undefined): string | null {
  return entry?.discovered === true ? DISCOVERED_NOTE : null;
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
              {/* The address is in the line because Tortie cannot know whether
                  the browser actually opened — the CLI opens it and only
                  warns to a log if it fails. One sentence that works either
                  way beats two that guess. */}
              {started
                ? `Sign in at ${loginHost(loginUrl)} — it shows a 6-character code.`
                : 'Tortie couldn’t start SpecStory sign-in. Check the SpecStory command above, then try again.'}
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
  const [rechecking, setRechecking] = useState(false);

  const load = useCallback(async (refresh: boolean): Promise<void> => {
    const api = bridge();
    if (api === null) {
      setUnavailable(true);
      return;
    }
    try {
      const status = await api.status(refresh);
      setReading({ status, at: Date.now() });
    } catch {
      setUnavailable(true);
    }
  }, []);

  // On mount, and again when the window returns to the front — a sign-in done
  // in a terminal is exactly the change this section must not miss, and focus
  // is the moment the user is looking at it. No timer: see the file header.
  useEffect(() => {
    void load(false);
    const onFocus = (): void => void load(false);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [load]);

  /**
   * The one path in this section that passes `refresh`. It drops main's cached
   * binary resolution AND its cached provider probe, which is what makes a
   * `brew upgrade specstory` done in a terminal visible without restarting
   * Tortie. Focus reloads deliberately do not: re-probing a binary every time
   * a window comes forward is the polling this section refuses to do.
   */
  const recheck = useCallback((): void => {
    if (rechecking) return;
    setRechecking(true);
    void load(true).finally(() => setRechecking(false));
  }, [load, rechecking]);

  const captureAgents: SpecStoryCaptureAgent[] =
    reading?.status.captureAgents ?? defaultCaptureAgents();
  const capturable = new Map(
    captureAgents.map((a) => [a.agentId as string, a])
  );
  const installed = (scan?.agents ?? []).filter(
    (a) => a.launchable && a.installed
  );
  const rows = installed.filter((a) => capturable.has(a.id));

  // Agents this Mac cannot capture. They used to be absent, which read as an
  // omission; each one now keeps its row and says which of the three reasons
  // main gave applies to it.
  const blockedById = new Map(
    (reading?.status.blockedCaptureAgents ?? []).map((b) => [b.agentId as string, b])
  );
  const blockedRows = installed.flatMap((agent) => {
    if (capturable.has(agent.id)) return [];
    const blocked = blockedById.get(agent.id);
    return blocked === undefined ? [] : [{ agent, blocked }];
  });

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
            This build can’t report on SpecStory — quit and reopen Tortie; if
            it keeps happening, reinstall it.
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

      {/* Right-aligned and alone, the same shape the Agents section uses for
          Re-scan. There is no "last checked" age beside it, because an age
          that climbs while you watch it is the one thing this section has
          refused since Phase 15. */}
      <div className="set-section-toolbar ss-toolbar">
        <button
          type="button"
          className="btn btn-secondary set-rescan"
          disabled={rechecking}
          onClick={recheck}
        >
          {rechecking ? (
            <>
              <span className="set-spinner" aria-hidden="true" />
              Checking…
            </>
          ) : (
            'Re-check'
          )}
        </button>
      </div>

      <div className="set-card">
        {reading === null ? (
          <div className="set-empty-line">Looking for SpecStory…</div>
        ) : (
          <>
            <BinaryRow status={reading.status} />
            <OtherBinariesRow status={reading.status} />
          </>
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
          it shows you. Tortie never sees your password.
        </p>
      ) : null}

      <div className="set-group-label">Capture new sessions</div>
      <div className="set-card">
        {scan === null ? (
          <div className="set-empty-line">Looking for installed agents…</div>
        ) : rows.length === 0 && blockedRows.length === 0 ? (
          <div className="set-empty-line">
            None of the agents SpecStory can capture are installed here.
          </div>
        ) : (
          <>
            {rows.map((agent) => (
              <CaptureRow
                key={agent.id}
                agent={agent}
                // Through the shared helper, not `=== true` written again here:
                // it is the one place "no stored answer means OFF" is decided,
                // and this switch must read the same rule the ⌘T sheet prefills
                // from and main's create path obeys.
                on={captureDefaultFor(settings, agent.id)}
                disabled={captureDisabled}
                note={discoveredNote(capturable.get(agent.id))}
                onChange={(next) => setCaptureDefault(agent.id, next)}
              />
            ))}
            {/* Blocked agents come last, so the list a user can act on stays
                at the top of the card. The switch is drawn OFF whatever is
                stored for it: the honest answer to "will this start captured"
                is no, and the stored preference comes back the day the agent
                becomes capturable again. */}
            {blockedRows.map(({ agent, blocked }) => (
              <CaptureRow
                key={agent.id}
                agent={agent}
                on={false}
                disabled
                blocked
                note={blockedNote(blocked, agent, reading?.status.binary ?? null)}
                onChange={() => undefined}
              />
            ))}
          </>
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
