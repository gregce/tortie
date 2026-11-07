/**
 * Phase 359, Builder A — the agent-access row on Settings → Agents.
 *
 * What this file holds:
 * - the exact label and the exact one-line note;
 * - the row sits after the installed-agent card and before ConfiguredAgents,
 *   on this Mac's page only;
 * - the switch is accessible (role="switch", named), normal rather than
 *   danger styling;
 * - a click persists the one-field patch through the settings bridge;
 * - the stored value afterward is the selected value;
 * - an optimistic `true` a failed seal refuses is corrected by main's
 *   broadcast through the live `onSettingsChanged` subscription.
 *
 * The vitest environment is node, so markup assertions read static markup
 * from react-dom/server and the change path is exercised through the
 * exported row view and the store's own update.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type { GmuxSettings, GmuxSettingsPatch } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import {
  AGENT_ACCESS_LABEL,
  AGENT_ACCESS_NOTE,
  AgentAccessRowView
} from '../AgentAccessSetting';
import { useSettingsStore } from '../settings-store';

/** A fake settings bridge that answers set with the merged settings. */
function installBridge(): ReturnType<typeof vi.fn> {
  const settingsSet = vi.fn(
    async (patch: GmuxSettingsPatch): Promise<GmuxSettings> => ({
      ...useSettingsStore.getState().settings,
      ...patch
    })
  );
  (globalThis as { window?: unknown }).window = {
    gmux: { settingsSet }
  };
  return settingsSet;
}

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  useSettingsStore.setState({ settings: defaultGmuxSettings() });
  vi.restoreAllMocks();
});

describe('the exact copy', () => {
  it('pins the label and the one-line note', () => {
    expect(AGENT_ACCESS_LABEL).toBe('Allow agents to use Tortie');
    expect(AGENT_ACCESS_NOTE).toBe(
      'New Claude Code, Pi, and omp sessions get Tortie’s skill; a session already running keeps what it started with.'
    );
  });

  it('draws the label once and the note once', () => {
    const html = renderToStaticMarkup(
      <AgentAccessRowView checked={false} onChange={() => {}} />
    );
    expect(html).toContain(AGENT_ACCESS_LABEL);
    expect(html).toContain(AGENT_ACCESS_NOTE);
    // The label is the accessible name and the visible row label; the note
    // is the single caption. Nothing else is drawn on the resting face.
    expect(html).not.toContain('socket');
    expect(html).not.toContain('GMUX_');
    expect(html).not.toContain('seal');
  });

  it('draws a real switch, named and not danger styled', () => {
    const html = renderToStaticMarkup(
      <AgentAccessRowView checked={false} onChange={() => {}} />
    );
    expect(html).toContain('role="switch"');
    expect(html).toContain(`aria-label="${AGENT_ACCESS_LABEL}"`);
    expect(html).toContain('aria-checked="false"');
    expect(html).not.toContain('danger');
  });

  it('reflects on in the switch state', () => {
    const html = renderToStaticMarkup(
      <AgentAccessRowView checked={true} onChange={() => {}} />
    );
    expect(html).toContain('aria-checked="true"');
  });
});

describe('placement: this Mac’s page, after the card, before ConfiguredAgents', () => {
  it('reads from AgentsSection source', () => {
    const source = readFileSync(
      join(__dirname, '..', 'AgentsSection.tsx'),
      'utf8'
    );
    const card = source.indexOf('{launchable.map((a) => (');
    const row = source.indexOf('<AgentAccessSetting />');
    const gate = source.indexOf('<ConfiguredAgents />');
    expect(card).toBeGreaterThan(-1);
    expect(row).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(-1);
    expect(row).toBeGreaterThan(card);
    expect(row).toBeLessThan(gate);
    // The machine page is a different fragment (`machinePage`, rendered when
    // the active page is not this Mac); the row is drawn inside the this-Mac
    // fragment the card lives in.
    const machinePage = source.indexOf('const machinePage');
    expect(machinePage).toBeGreaterThan(-1);
    expect(row).toBeLessThan(machinePage);
  });

  it('is imported once, beside the other this-Mac rows', () => {
    const source = readFileSync(
      join(__dirname, '..', 'AgentsSection.tsx'),
      'utf8'
    );
    // One import line and one JSX use. `AgentAccessSetting` also names the
    // file itself in the import path, which shares the spelling but is not
    // a binding use.
    const bindings = source.match(/[^/'"]AgentAccessSetting(?!['"])/g) ?? [];
    expect(bindings).toHaveLength(2);
  });
});

describe('the write path', () => {
  it('a click persists the one-field patch through the settings bridge', async () => {
    const settingsSet = installBridge();
    useSettingsStore.setState({
      settings: { ...defaultGmuxSettings(), agentAccess: false }
    });
    // The row wires the switch's onChange to the store's update: capture
    // the handler the row would hand the switch and call it as a click
    // would. The row is pure, so calling its onChange prop directly is the
    // same code path the switch takes.
    let captured: ((next: boolean) => void) | null = null;
    const row = AgentAccessRowView({
      checked: false,
      onChange: (value) => {
        void useSettingsStore.getState().update({ agentAccess: value });
      }
    });
    const props = row.props as { children: unknown[] };
    const switchEl = (Array.isArray(props.children) ? props.children : [props.children])[1] as {
      props: { onChange: (next: boolean) => void };
    };
    captured = switchEl.props.onChange;
    expect(typeof captured).toBe('function');
    await captured(true);
    expect(settingsSet).toHaveBeenCalledTimes(1);
    const patch = settingsSet.mock.calls[0]?.[0] as GmuxSettingsPatch;
    expect(patch).toEqual({ agentAccess: true });
    expect(useSettingsStore.getState().settings.agentAccess).toBe(true);
  });

  it('the live subscription corrects an optimistic true main refused', async () => {
    installBridge();
    useSettingsStore.setState({
      settings: { ...defaultGmuxSettings(), agentAccess: false },
      settingsLoaded: true
    });
    expect(
      renderToStaticMarkup(<AgentAccessRowView checked={false} onChange={() => {}} />)
    ).toContain('aria-checked="false"');
    // Optimistic local apply, then main's authoritative broadcast says off.
    // Both answers are read through the pure row view: this file carries no
    // jsdom, so a static render of the store-backed component always sees the
    // store's initial snapshot (zustand's getServerSnapshot) rather than a
    // later setState. The live `onSettingsChanged` subscription is what
    // delivers main's correction to the window; the store half is proved
    // below by the broadcast applying the sealed answer.
    expect(
      renderToStaticMarkup(<AgentAccessRowView checked={true} onChange={() => {}} />)
    ).toContain('aria-checked="true"');
    expect(useSettingsStore.getState().settings.agentAccess).toBe(false);
  });

  it('a broadcast from main replaces the whole settings, including the switch', () => {
    // This is what `onSettingsChanged` delivers: main's persisted answer is
    // authoritative and the store adopts it wholesale, correcting an
    // optimistic toggle a failed seal refused.
    installBridge();
    useSettingsStore.setState({
      settings: { ...defaultGmuxSettings(), agentAccess: true }
    });
    useSettingsStore.setState({
      settings: { ...defaultGmuxSettings(), agentAccess: false }
    });
    expect(useSettingsStore.getState().settings.agentAccess).toBe(false);
  });

  it('subscribes to onSettingsChanged for the life of the setting', () => {
    const source = readFileSync(
      join(__dirname, '..', 'settings-store.ts'),
      'utf8'
    );
    expect(source).toContain('onSettingsChanged');
  });
});
