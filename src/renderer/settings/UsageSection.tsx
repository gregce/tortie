/**
 * Settings then Usage (Phase 181): the per provider opt in for the
 * subscription meter.
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
  USAGE_GROUP,
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

export function UsageSection(): React.JSX.Element {
  return (
    <section aria-label={USAGE_TITLE}>
      <h1 className="set-title">{USAGE_TITLE}</h1>

      <div className="set-group-label">{USAGE_GROUP}</div>
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
          does not need four paragraphs and a person deciding whether to trust
          the read does. */}
      <details className="set-disclosure" data-usage-about="1">
        <summary>{USAGE_ABOUT_OPEN}</summary>
        <p className="set-section-caption">{USAGE_ABOUT_WHERE}</p>
        <p className="set-section-caption">{USAGE_ABOUT_READONLY}</p>
        <p className="set-section-caption">{USAGE_ABOUT_KEPT}</p>
        <p className="set-section-caption">{USAGE_ABOUT_WHEN}</p>
      </details>
    </section>
  );
}
