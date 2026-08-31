/**
 * Settings then Agents then Usage: the row that chooses which window the bar
 * fills to (Phase 181.2), run rather than read.
 *
 * WHAT IS HELD HERE. The three choices are drawn, the shipped one is the five
 * hour window, the page says in plain words what most used means, because an
 * unlabelled maximum is the confusion this phase exists to fix, and the write
 * is ONE field: a patch that carried the whole settings object would let this
 * row overwrite a switch somebody else had just flipped.
 *
 * This repository carries no jsdom, so the group renders through
 * `renderToStaticMarkup` and the writer is called as a function.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GmuxSettings, UsageBarWindow } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import { UsageGroup, setUsageBarWindow } from '../UsageGroup';
import {
  USAGE_BAR_CAPTION,
  USAGE_BAR_FIVE_HOUR,
  USAGE_BAR_LABEL,
  USAGE_BAR_MOST_USED,
  USAGE_BAR_SEVEN_DAY
} from '../usage-copy';
import { useSettingsStore } from '../settings-store';

function stub(bar: UsageBarWindow): string[] {
  const wrote: string[] = [];
  useSettingsStore.setState({
    settings: {
      ...defaultGmuxSettings(),
      usage: { claude: true, codex: true, bar }
    },
    settingsLoaded: true,
    async update(patch) {
      wrote.push(JSON.stringify(patch));
      const next: GmuxSettings = {
        ...useSettingsStore.getState().settings,
        ...patch
      } as GmuxSettings;
      useSettingsStore.setState({ settings: next });
      return next;
    }
  });
  return wrote;
}

afterEach(() => {
  useSettingsStore.setState({ settings: defaultGmuxSettings() });
});

describe('the row a person changes the bar with', () => {
  it('draws the label, the caption and all three choices', () => {
    stub('five-hour');
    const markup = renderToStaticMarkup(<UsageGroup />);
    expect(markup).toContain(USAGE_BAR_LABEL);
    expect(markup).toContain(USAGE_BAR_CAPTION);
    expect(markup).toContain(USAGE_BAR_FIVE_HOUR);
    expect(markup).toContain(USAGE_BAR_SEVEN_DAY);
    expect(markup).toContain(USAGE_BAR_MOST_USED);
  });

  it('says what most used means, which is the whole reason for the row', () => {
    expect(USAGE_BAR_CAPTION.toLowerCase()).toContain('most used');
    expect(USAGE_BAR_CAPTION.toLowerCase()).toContain('further along');
  });

  it('shows the shipped choice on a fresh install', () => {
    expect(defaultGmuxSettings().usage.bar).toBe('five-hour');
    stub('five-hour');
    expect(renderToStaticMarkup(<UsageGroup />)).toContain(
      'value="five-hour"'
    );
  });

  it('shows the choice a person already made', () => {
    stub('most-used');
    expect(renderToStaticMarkup(<UsageGroup />)).toContain(
      'value="most-used"'
    );
  });
});

describe('what the row writes', () => {
  it('patches the one field and leaves both switches alone', async () => {
    const wrote = stub('five-hour');
    await setUsageBarWindow('seven-day');
    expect(wrote).toEqual([
      JSON.stringify({ usage: { claude: true, codex: true, bar: 'seven-day' } })
    ]);
    expect(useSettingsStore.getState().settings.usage.bar).toBe('seven-day');
  });

  it('writes the shipped choice rather than a value that is not one', async () => {
    const wrote = stub('most-used');
    await setUsageBarWindow('hourly');
    expect(wrote[0]).toContain('"bar":"five-hour"');
  });
});
