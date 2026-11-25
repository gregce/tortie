/**
 * The usage meters, a group inside Settings then Agents (Phase 181.1).
 *
 * PHASE 181 gave this its own page on the rail. The operator moved it here the
 * next day, because Agents is where a person already goes to decide what an
 * agent is and does, and whether a meter is drawn for one is that same
 * decision. It is a MOVE and not a redesign: the same two switches, the same
 * default off, the same guarantees, and no new control.
 *
 * THREE SWITCHES SINCE PHASE 374, AND ONE CHOICE, the shape Catch Me Up and Architecture
 * settled. Phase 181.2 added the choice, being which window the bar fills to,
 * because the bar filled to whichever window was further along and said so
 * nowhere. EVERY SWITCH DEFAULTS OFF, and off is load bearing rather than
 * polite:
 * while a provider is off main opens no keychain, reads no credentials file
 * and makes no request at all. Turning Claude's or Codex's on is the whole of
 * the consent, because the only thing it can cause is one HTTPS GET to the
 * vendor that issued the login being sent, and that address is compiled in and
 * cannot be named by any settings file.
 *
 * ANTIGRAVITY'S IS THE THIRD (Phase 374) and it causes no request and reads no
 * login: it lets a session started afterwards report the numbers its own status
 * line is given. So its row has no logins list below it, and it carries one
 * line that is always drawn, saying Google was asked and has not answered. The
 * switch selects a compiled script and no settings field can name another.
 *
 * PHASE 375 GAVE IT ONE LINE UNDER THE LOGINS, read only: the account the
 * Antigravity CLI says it is signed in to, once one of its sessions has said
 * so. It is read through `usage:account`, which answers what main already
 * holds, because this page may not ask `usage:read` (the Phase 219 rule
 * below). It has no control: the account is switched in the Antigravity CLI.
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
import type {
  ClaudeStatusLineState,
  UsageProviderId,
  UsageSnapshot
} from '@shared/usage';
import { usageAddress, usageIsReceiver } from '@shared/usage';
import type { LoginProviderId } from '@shared/logins';
import { loginAccountLabel, loginRowDetail } from '@shared/login-copy';

/** Is this a macOS build? (Phase 211). The switch timing differs by platform. */
const IS_MAC =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent);
import { gmuxBridge } from '../bridge';
import { loginsOf, useLogins } from '../state/logins';
import { useSettingsStore } from './settings-store';
import { Switch } from './Switch';
import {
  USAGE_ABOUT_KEPT,
  USAGE_ABOUT_OPEN,
  USAGE_ABOUT_READONLY,
  USAGE_ABOUT_WHEN,
  USAGE_ABOUT_WHERE,
  USAGE_ANTIGRAVITY_ACCOUNT_NOTE,
  USAGE_ANTIGRAVITY_CAPTION,
  USAGE_ANTIGRAVITY_LABEL,
  USAGE_BAR_CAPTION,
  USAGE_BAR_FIVE_HOUR,
  USAGE_BAR_LABEL,
  USAGE_BAR_MOST_USED,
  USAGE_BAR_SEVEN_DAY,
  USAGE_CLAUDE_CAPTION,
  USAGE_CLAUDE_LABEL,
  USAGE_CLAUDE_OWNED_NOTE,
  USAGE_CLAUDE_UNWRITABLE_NOTE,
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

/**
 * Whether the Claude meter is live or polling, and why (Phase 219, item 8).
 *
 * ONE READ, on mount and on every flip of the switch it is about, and that
 * cadence is the whole design. The answer can only change when the switch
 * changes or when the person edits their own `.claude` settings by hand, so
 * there is nothing to poll: asking again when the switch moves is what makes
 * the line appear the moment a person turns Claude usage on.
 *
 * It deliberately does NOT go through the usage store beside it. That store's
 * reads can start a vendor request and open the person's keychain, and opening
 * Settings must do neither; `usage:statusLine` reads at most three files under
 * the person's own `.claude` and answers one word.
 *
 * A build whose preload has no `usage` member, and a read that fails, both
 * leave `off`, which draws nothing. A missing answer must never invent a
 * refusal.
 */
function useClaudeStatusLine(): ClaudeStatusLineState {
  const claudeOn = useSettingsStore((s) => s.settings.usage.claude);
  const [state, setState] = React.useState<ClaudeStatusLineState>('off');
  React.useEffect(() => {
    let live = true;
    const api = gmuxBridge()?.usage;
    if (api?.statusLine === undefined) return undefined;
    void api
      .statusLine()
      .then((next) => {
        if (live) setState(next);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [claudeOn]);
  return state;
}

/**
 * The one line under a switch, or nothing. `off` and `installed` say nothing.
 *
 * Exported for its test. This repository carries no jsdom, so a static render
 * never runs the effect above, and the mapping from a state to a sentence is
 * the part that can be wrong.
 */
export function statusLineNote(state: ClaudeStatusLineState): string | null {
  if (state === 'person-owns-it') return USAGE_CLAUDE_OWNED_NOTE;
  if (state === 'unwritable') return USAGE_CLAUDE_UNWRITABLE_NOTE;
  return null;
}

/** Exported for its test, for the same reason `statusLineNote` is. */
export function UsageRow({
  provider,
  label,
  caption,
  note,
  noteWarns = true
}: {
  provider: UsageProviderId;
  label: string;
  caption: string;
  /** One short line under the caption, drawn only while it is true. */
  note?: string | null;
  /**
   * False for a line that is a fact to know rather than something in the way
   * (Phase 374). The warning ink is for a meter that is not working as asked.
   */
  noteWarns?: boolean;
}): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  return (
    <div className="set-row tall">
      <div className="set-row-text">
        <span className="set-row-label">{label}</span>
        <span className="set-row-caption">{caption}</span>
        {note == null ? null : (
          <span
            className={noteWarns ? 'set-row-caption set-row-warn' : 'set-row-caption'}
            data-usage-note={provider}
          >
            {note}
          </span>
        )}
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
 * ONE ROW FOR EVERY PROVIDER AND FOR ALL THREE METERS. There is deliberately
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
          // PHASE 204. The second half of the line says what choosing this
          // login would do, and it appears only on a row where a switch would
          // put an account back. Every other row reads as it did before.
          const detail = loginRowDetail(row, IS_MAC);
          return (
            <span
              className="set-row-caption"
              key={row.name}
              data-login={row.name}
              data-login-account={row.email ?? ''}
              data-login-kept={row.kept ? '1' : '0'}
              data-login-restores={row.restores ? '1' : '0'}
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

/**
 * The two members of the usage bridge the account line reads (Phase 375).
 * Both optional, because a build whose preload has neither draws nothing.
 */
export interface AntigravityAccountBridge {
  account?: () => Promise<string | null>;
  onChanged?: (cb: (snapshot: UsageSnapshot) => void) => () => void;
}

/**
 * Follow the account the Antigravity CLI is signed in to (Phase 375 D10).
 * Exported for its test, which has no jsdom to run the effect that calls it.
 *
 * ONE READ, then the push every window hears. `usage:account` answers what
 * main already holds and starts nothing: no vendor request, no keychain, no
 * folder, no login read. `usage.onChanged` carries the snapshot a row moved
 * in, and its received row's `email`, Antigravity's, is the same address. Every value is
 * asked of `usageAddress` here as well, so a value main should never have
 * sent is drawn as nothing. A read that fails, and a build with no `account`
 * member, leave nothing drawn: a missing answer never invents an account.
 *
 * Returns its own stop, which also drops a read still in flight.
 */
export function watchAntigravityAccount(
  api: AntigravityAccountBridge | undefined,
  set: (address: string | null) => void
): () => void {
  if (api?.account === undefined) return () => undefined;
  let live = true;
  void api
    .account()
    .then((next) => {
      if (live) set(usageAddress(next));
    })
    .catch(() => {
      if (live) set(null);
    });
  const unwatch = api.onChanged?.((snapshot) => {
    if (!live) return;
    // The received row, being the one row an address ever rides on (D6). A
    // stray `email` on any other row is never read.
    const row = snapshot.providers.find((p) => usageIsReceiver(p.provider));
    set(usageAddress(row?.email));
  });
  return () => {
    live = false;
    unwatch?.();
  };
}

/**
 * The account, asked on mount and again on every flip of the Antigravity
 * switch, which is when main can first or last have one. Each flip forgets
 * the address held before it until main answers again, because turning the
 * meter off removes what the address was read from.
 */
function useAntigravityAccount(): string | null {
  const on = useSettingsStore((s) => s.settings.usage.antigravity);
  const [address, setAddress] = React.useState<string | null>(null);
  React.useEffect(() => {
    setAddress(null);
    return watchAntigravityAccount(gmuxBridge()?.usage, setAddress);
  }, [on]);
  return address;
}

/**
 * The Antigravity line under the logins (Phase 375 D9), or nothing.
 *
 * DRAWN ONLY WHILE THE SWITCH IS ON AND AN ADDRESS IS KNOWN. It is the
 * account's address and one sentence saying where it is switched, and it
 * carries NO CONTROL: Tortie does not choose, add or remove a Google account
 * (research 146 §8). It reads as a row of the list above it, so the probe
 * finds it the way it finds Claude's and Codex's, by `data-logins`.
 *
 * Exported for its test, for the reason `statusLineNote` is.
 */
export function AntigravityAccountRow({
  address
}: {
  address: string | null;
}): React.JSX.Element | null {
  const on = useSettingsStore((s) => s.settings.usage.antigravity);
  const shown = usageAddress(address);
  if (!on || shown === null) return null;
  return (
    <div className="set-row tall" data-logins="antigravity">
      <div className="set-row-text">
        <span className="set-row-label">{USAGE_ANTIGRAVITY_LABEL}</span>
        <span className="set-row-caption" data-antigravity-account="1">
          {`${shown} · ${USAGE_ANTIGRAVITY_ACCOUNT_NOTE}`}
        </span>
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
  // PHASE 219, ITEM 8. Why the Claude meter is polling rather than moving when
  // a turn ends. Codex has no status line at all, so it has no such note.
  const claudeStatusLine = useClaudeStatusLine();
  const antigravityAccount = useAntigravityAccount();
  return (
    <div data-usage-group="1">
      <div className="set-group-label">{USAGE_TITLE}</div>
      <div className="set-card">
        <UsageRow
          provider="claude"
          label={USAGE_CLAUDE_LABEL}
          caption={USAGE_CLAUDE_CAPTION}
          note={statusLineNote(claudeStatusLine)}
        />
        <UsageRow
          provider="codex"
          label={USAGE_CODEX_LABEL}
          caption={USAGE_CODEX_CAPTION}
        />
        <UsageRow
          provider="antigravity"
          label={USAGE_ANTIGRAVITY_LABEL}
          caption={USAGE_ANTIGRAVITY_CAPTION}
          noteWarns={false}
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
          card, beside the numbers the choice is about.
          PHASE 374 ADDED NO BLOCK HERE: Antigravity's meter has no login.
          PHASE 375 ADDED ONE LINE, read only: the account its sessions
          reported, with no control, while the meter is on. */}
      <div className="set-group-label">{USAGE_LOGINS_LABEL}</div>
      <div className="set-card">
        <LoginsBlock provider="claude" label={USAGE_CLAUDE_LABEL} />
        <LoginsBlock provider="codex" label={USAGE_CODEX_LABEL} />
        <AntigravityAccountRow address={antigravityAccount} />
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
