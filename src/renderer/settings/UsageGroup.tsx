/**
 * The usage meters, a group inside Settings then Agents (Phase 181.1).
 *
 * PHASE 181 gave this its own page on the rail. The operator moved it here the
 * next day, because Agents is where a person already goes to decide what an
 * agent is and does, and whether a meter is drawn for one is that same
 * decision. It is a MOVE and not a redesign: the same two switches, the same
 * default off, the same guarantees, and no new control.
 *
 * TWO SWITCHES AND ONE CHOICE, the shape Catch Me Up and Architecture
 * settled. Phase 181.2 added the choice, being which window the bar fills to,
 * because the bar filled to whichever window was further along and said so
 * nowhere. BOTH SWITCHES DEFAULT OFF, and off is load bearing rather than
 * polite:
 * while a provider is off main opens no keychain, reads no credentials file
 * and makes no request at all. Turning one on is the whole of the consent,
 * because the only thing it can cause is one HTTPS GET to the vendor that
 * issued the login being sent, and that address is compiled in and cannot be
 * named by any settings file.
 *
 * There is no interval control, no account control and no plan control. The
 * meter is read only: no reset credits, no account switching, no plan
 * management. Everything a person may want to know once sits behind the one
 * shut disclosure at the bottom.
 *
 * It draws on this Mac's page only, because what it reads is the login stored
 * on this Mac.
 */

import React from 'react';
import type { GmuxSettings, UsageBarWindow } from '@shared/settings';
import { sanitizeUsageBarWindow } from '@shared/settings';
import type { UsageProviderId } from '@shared/usage';
import type { LoginProviderId } from '@shared/logins';
import { loginAccountDetail, loginAccountLabel } from '@shared/login-copy';
import { loginsOf, useLogins } from '../state/logins';
import { useSettingsStore } from './settings-store';
import { Switch } from './Switch';
import {
  USAGE_ABOUT_KEPT,
  USAGE_ABOUT_OPEN,
  USAGE_ABOUT_READONLY,
  USAGE_ABOUT_WHEN,
  USAGE_ABOUT_WHERE,
  USAGE_BAR_CAPTION,
  USAGE_BAR_FIVE_HOUR,
  USAGE_BAR_LABEL,
  USAGE_BAR_MOST_USED,
  USAGE_BAR_SEVEN_DAY,
  USAGE_CLAUDE_CAPTION,
  USAGE_CLAUDE_LABEL,
  USAGE_CODEX_CAPTION,
  USAGE_CODEX_LABEL,
  USAGE_LOGIN_CHOSEN,
  USAGE_LOGIN_REMOVE,
  USAGE_LOGIN_REMOVE_NOTE,
  USAGE_LOGINS_CAPTION,
  USAGE_LOGINS_LABEL,
  USAGE_OFF_NOTE,
  USAGE_TITLE
} from './usage-copy';

/** The three choices, in the order they are offered. */
const BAR_OPTIONS: { value: UsageBarWindow; label: string }[] = [
  { value: 'five-hour', label: USAGE_BAR_FIVE_HOUR },
  { value: 'seven-day', label: USAGE_BAR_SEVEN_DAY },
  { value: 'most-used', label: USAGE_BAR_MOST_USED }
];

/**
 * Persist one switch as a one field patch. Exported for the unit test, which
 * runs under the node environment and cannot fire a click on server rendered
 * markup.
 */
export function setUsageProvider(
  provider: UsageProviderId,
  on: boolean
): Promise<GmuxSettings | null> {
  const store = useSettingsStore.getState();
  return store.update({ usage: { ...store.settings.usage, [provider]: on } });
}

/**
 * Persist the bar's window as a one field patch (Phase 181.2). Exported for
 * the unit test, for the reason the switch above states.
 *
 * The value comes off a select this file drew, so it is one of the three, and
 * it is sanitized anyway: the settings file is the same file every other
 * choice is written to, and a value that is not a choice reads as the shipped
 * one rather than reaching a face.
 */
export function setUsageBarWindow(raw: string): Promise<GmuxSettings | null> {
  const store = useSettingsStore.getState();
  return store.update({
    usage: { ...store.settings.usage, bar: sanitizeUsageBarWindow(raw) }
  });
}

function UsageRow({
  provider,
  label,
  caption
}: {
  provider: UsageProviderId;
  label: string;
  caption: string;
}): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">{label}</span>
        <span className="set-row-caption">{caption}</span>
      </div>
      <Switch
        checked={settings.usage[provider]}
        label={label}
        onChange={(next) => {
          void setUsageProvider(provider, next);
        }}
      />
    </div>
  );
}

/**
 * Which window the one bar per provider fills to (Phase 181.2).
 *
 * ONE ROW FOR BOTH PROVIDERS AND FOR ALL THREE METERS. There is deliberately
 * no per provider variant: the confusion being fixed is that a bar and the
 * number beside a bar named different windows, and a per provider answer
 * makes that worse rather than better. The hover card goes on naming every
 * window in full whatever this says.
 */
function BarWindowRow(): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">{USAGE_BAR_LABEL}</span>
        <span className="set-row-caption">{USAGE_BAR_CAPTION}</span>
      </div>
      <select
        className="set-select"
        aria-label={USAGE_BAR_LABEL}
        data-usage-bar="1"
        value={settings.usage.bar}
        onChange={(e) => {
          void setUsageBarWindow(e.target.value);
        }}
      >
        {BAR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * One provider's logins, listed, with Remove on the ones Tortie owns
 * (Phase 202).
 *
 * THE DEFAULT LOGIN HAS NO CONTROL AT ALL, and the absence is the surface
 * saying what the code says: it is the person's own sign in, at the vendor's
 * own location, and Tortie never writes it, never moves it and never removes
 * it. There is no rename either, for any login: a name is what the manifest
 * carries, and renaming one would strand every session that named it.
 *
 * CHOOSING IS NOT DONE HERE. It is done from the meter's own hover card, where
 * the numbers a person is looking at are, so this page stays a list and a
 * remove rather than a second place to make the same decision.
 *
 * PHASE 203. EACH ROW IS DRAWN AS ITS ACCOUNT, the address leading and the
 * name Tortie holds beside it, and the default row is marked in one short
 * phrase as the one Tortie does not own. `Default` is still the row's name
 * underneath, because that name is the reserved manifest key, and it is still
 * what Remove and the chosen mark work on.
 */
function LoginsBlock({
  provider,
  label
}: {
  provider: LoginProviderId;
  label: string;
}): React.JSX.Element | null {
  const snapshot = useLogins((s) => s.snapshot);
  const busy = useLogins((s) => s.busy);
  const available = useLogins((s) => s.available);
  const remove = useLogins((s) => s.remove);
  const load = useLogins((s) => s.load);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (!available) return null;
  const rows = loginsOf(snapshot, provider);
  return (
    <div className="set-row tall" data-logins={provider}>
      <div className="set-row-text">
        <span className="set-row-label">{label}</span>
        {rows.map((row) => {
          const detail = loginAccountDetail(row);
          return (
            <span
              className="set-row-caption"
              key={row.name}
              data-login={row.name}
              data-login-account={row.email ?? ''}
            >
              {loginAccountLabel(row)}
              {detail === '' ? '' : ` · ${detail}`}
              {row.chosen ? ` · ${USAGE_LOGIN_CHOSEN}` : ''}
              {row.isDefault ? null : (
                <button
                  type="button"
                  className="set-inline-btn"
                  disabled={busy}
                  data-login-remove={row.name}
                  onClick={() => void remove(provider, row.name)}
                >
                  {USAGE_LOGIN_REMOVE}
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/** Everything the logins block says, once, under the two per provider lists. */
function LoginsCaptions(): React.JSX.Element {
  const problems = useLogins((s) => s.snapshot.problems);
  const problem = useLogins((s) => s.problem);
  return (
    <div className="set-row">
      <div className="set-row-text">
        <span className="set-row-caption">{USAGE_LOGINS_CAPTION}</span>
        <span className="set-row-caption">{USAGE_LOGIN_REMOVE_NOTE}</span>
        {/* An invalid row in the logins file is dropped WHOLE and named here,
            with the field and the reason, which is the standing rule for every
            file a person or an agent can write. */}
        {problems.map((text) => (
          <span className="set-row-caption set-row-warn" key={text}>
            {text}
          </span>
        ))}
        {problem === null ? null : (
          <span className="set-row-caption set-row-warn">{problem}</span>
        )}
      </div>
    </div>
  );
}

export function UsageGroup(): React.JSX.Element {
  return (
    <div data-usage-group="1">
      <div className="set-group-label">{USAGE_TITLE}</div>
      <div className="set-card">
        <UsageRow
          provider="claude"
          label={USAGE_CLAUDE_LABEL}
          caption={USAGE_CLAUDE_CAPTION}
        />
        <UsageRow
          provider="codex"
          label={USAGE_CODEX_LABEL}
          caption={USAGE_CODEX_CAPTION}
        />
        <BarWindowRow />
        <div className="set-row">
          <div className="set-row-text">
            <span className="set-row-caption">{USAGE_OFF_NOTE}</span>
          </div>
        </div>
      </div>

      {/* PHASE 202. The logins, listed here so the meter's own card stays
          short. This block is a list and a remove; choosing is done from the
          card, beside the numbers the choice is about. */}
      <div className="set-group-label">{USAGE_LOGINS_LABEL}</div>
      <div className="set-card">
        <LoginsBlock provider="claude" label={USAGE_CLAUDE_LABEL} />
        <LoginsBlock provider="codex" label={USAGE_CODEX_LABEL} />
        <LoginsCaptions />
      </div>

      {/* One shut disclosure, the shape the Architecture page settled under
          the just enough words rule. The resting face of this block is the
          summary line and nothing else, because a person flipping a switch
          does not need paragraphs and a person deciding whether to trust the
          read does. Phase 181.1 cut those paragraphs down at his word, and
          every promise they made is still in them. */}
      <details className="set-disclosure" data-usage-about="1">
        <summary>{USAGE_ABOUT_OPEN}</summary>
        <p className="set-section-caption">{USAGE_ABOUT_WHERE}</p>
        <p className="set-section-caption">{USAGE_ABOUT_READONLY}</p>
        <p className="set-section-caption">{USAGE_ABOUT_KEPT}</p>
        <p className="set-section-caption">{USAGE_ABOUT_WHEN}</p>
      </details>
    </div>
  );
}
