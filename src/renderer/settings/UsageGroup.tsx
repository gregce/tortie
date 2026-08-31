/**
 * The usage meters, a group inside Settings then Agents (Phase 181.1).
 *
 * PHASE 181 gave this its own page on the rail. The operator moved it here the
 * next day, because Agents is where a person already goes to decide what an
 * agent is and does, and whether a meter is drawn for one is that same
 * decision. It is a MOVE and not a redesign: the same two switches, the same
 * default off, the same guarantees, and no new control.
 *
 * TWO SWITCHES AND NOTHING ELSE, the shape Catch Me Up and Architecture
 * settled. BOTH DEFAULT OFF, and off is load bearing rather than polite:
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
import type { GmuxSettings } from '@shared/settings';
import type { UsageProviderId } from '@shared/usage';
import { useSettingsStore } from './settings-store';
import { Switch } from './Switch';
import {
  USAGE_ABOUT_KEPT,
  USAGE_ABOUT_OPEN,
  USAGE_ABOUT_READONLY,
  USAGE_ABOUT_WHEN,
  USAGE_ABOUT_WHERE,
  USAGE_CLAUDE_CAPTION,
  USAGE_CLAUDE_LABEL,
  USAGE_CODEX_CAPTION,
  USAGE_CODEX_LABEL,
  USAGE_OFF_NOTE,
  USAGE_TITLE
} from './usage-copy';

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
        <div className="set-row">
          <div className="set-row-text">
            <span className="set-row-caption">{USAGE_OFF_NOTE}</span>
          </div>
        </div>
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
