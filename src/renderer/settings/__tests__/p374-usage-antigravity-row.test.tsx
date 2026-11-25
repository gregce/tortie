/**
 * Settings then Agents then Usage: the third switch (Phase 374;
 * build/p374/SPEC.md R4), run rather than read.
 *
 * It ships OFF, it says in one caption what turning it on does, and the line
 * that Google was asked and has not answered is drawn whether it is on or off,
 * because that is worth knowing before the switch is pressed. It has no logins
 * list. And the three sentences of How this works that a meter which asks
 * nobody made false are each pinned whole here.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GmuxSettings } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import { UsageGroup, setUsageProvider } from '../UsageGroup';
import {
  USAGE_ABOUT_KEPT,
  USAGE_ABOUT_READONLY,
  USAGE_ABOUT_WHEN,
  USAGE_ABOUT_WHERE,
  USAGE_ANTIGRAVITY_CAPTION,
  USAGE_ANTIGRAVITY_LABEL,
  USAGE_CODEX_CAPTION,
  USAGE_OFF_NOTE
} from '../usage-copy';
import { useSettingsStore } from '../settings-store';

const initial = useSettingsStore.getInitialState();
const shipped = initial.settings;

/** The whole group, drawn with the third switch where a test wants it. */
function group(on: boolean): string {
  const settings = defaultGmuxSettings();
  initial.settings = { ...settings, usage: { ...settings.usage, antigravity: on } };
  return renderToStaticMarkup(<UsageGroup />)
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&');
}

/** The third row alone, from its label to the next row's. */
function row(markup: string): string {
  const from = markup.indexOf(
    `<span class="set-row-label">${USAGE_ANTIGRAVITY_LABEL}</span>`
  );
  expect(from).toBeGreaterThan(-1);
  const rest = markup.slice(from);
  const next = rest.indexOf('class="set-row');
  const until = rest.indexOf('<div class="set-row', next);
  return rest.slice(0, until < 0 ? undefined : until);
}

afterEach(() => {
  initial.settings = shipped;
  useSettingsStore.setState({ settings: defaultGmuxSettings() });
});

describe('R4: the third switch', () => {
  it('ships off, and draws off', () => {
    expect(defaultGmuxSettings().usage.antigravity).toBe(false);
    expect(row(group(false))).toContain('aria-checked="false"');
    expect(row(group(true))).toContain('aria-checked="true"');
  });

  it('is the third, after Codex and before the bar', () => {
    const markup = group(false);
    expect(markup.indexOf(USAGE_CODEX_CAPTION)).toBeGreaterThan(-1);
    expect(markup.indexOf(USAGE_ANTIGRAVITY_CAPTION)).toBeGreaterThan(
      markup.indexOf(USAGE_CODEX_CAPTION)
    );
    expect(markup.indexOf('data-usage-bar')).toBeGreaterThan(
      markup.indexOf(USAGE_ANTIGRAVITY_CAPTION)
    );
  });

  it('says what turning it on does, in the shape of the Claude and Codex rows', () => {
    expect(USAGE_ANTIGRAVITY_CAPTION).toBe(
      'Reads how much of your plan you have used from the Antigravity CLI, in sessions you start after this is on.'
    );
    expect(group(false)).toContain(USAGE_ANTIGRAVITY_CAPTION);
  });

  it('draws no note under it, on or off (his word of 2026-11-25)', () => {
    for (const on of [false, true]) {
      expect(group(on)).not.toContain('data-usage-note="antigravity"');
      expect(group(on)).not.toContain('has not answered');
    }
  });

  it('has no logins list', () => {
    const markup = group(true);
    expect(markup).not.toContain('data-logins="antigravity"');
    // Its name is drawn once as a label, on the switch's own row.
    expect(
      markup.split(`<span class="set-row-label">${USAGE_ANTIGRAVITY_LABEL}</span>`)
        .length - 1
    ).toBe(1);
  });

  it('writes its own field and leaves the rest alone', async () => {
    const wrote: string[] = [];
    useSettingsStore.setState({
      settings: {
        ...defaultGmuxSettings(),
        usage: { claude: true, codex: false, antigravity: false, bar: 'seven-day' }
      },
      settingsLoaded: true,
      async update(patch) {
        wrote.push(JSON.stringify(patch));
        return useSettingsStore.getState().settings as GmuxSettings;
      }
    });
    await setUsageProvider('antigravity', true);
    expect(JSON.parse(wrote[0] ?? '{}')).toEqual({
      usage: { claude: true, codex: false, antigravity: true, bar: 'seven-day' }
    });
  });
});

describe('R4: what How this works says now', () => {
  it('names which meters each sentence is about', () => {
    expect(USAGE_ABOUT_WHERE).toBe(
      'Claude and Codex ask only the vendor that issued your login. Both addresses are built in and no setting changes them. Antigravity asks nobody.'
    );
    // PHASE 375 (build/p375/SPEC.md §5, D15) narrowed this one again, on
    // purpose: the account an Antigravity session reports is kept too.
    expect(USAGE_ABOUT_KEPT).toBe(
      "Claude and Codex numbers stay in memory until you quit. Antigravity's numbers and the account they belong to stay in Tortie's own folder until you turn that meter off or remove the session. No part of a login reaches a log or any other file."
    );
    expect(USAGE_ABOUT_WHEN).toBe(
      'Claude and Codex ask every fifteen minutes, and only while this window is in front. The refresh control asks now. Antigravity updates as its sessions work.'
    );
  });

  it('keeps the two that stayed true', () => {
    expect(USAGE_ABOUT_READONLY).toBe(
      'Your login is read, never written, refreshed or copied. Run the agent once to refresh a stale login.'
    );
    expect(USAGE_OFF_NOTE).toBe(
      'While a meter is off nothing is read and nothing is sent.'
    );
  });

  it('draws all four in the shut disclosure, and promises nothing else', () => {
    const markup = group(false);
    for (const text of [
      USAGE_ABOUT_WHERE,
      USAGE_ABOUT_READONLY,
      USAGE_ABOUT_KEPT,
      USAGE_ABOUT_WHEN
    ]) {
      expect(markup).toContain(text);
    }
    const drawn = [
      USAGE_ANTIGRAVITY_CAPTION,
          USAGE_ABOUT_WHERE,
      USAGE_ABOUT_KEPT,
      USAGE_ABOUT_WHEN
    ].join(' ');
    expect(drawn).not.toMatch(/credit|tmux|gemini|allowed to|guarantee/i);
  });
});
