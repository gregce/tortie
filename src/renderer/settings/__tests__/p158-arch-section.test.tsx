/**
 * Settings then Architecture (Phase 158), run rather than read.
 *
 * The refusals held here are the Catch Me Up section's, asked again about
 * the arch surface, plus the two that are this phase's own:
 *
 *  - None is the shipped answer and nothing is applied on its own, not even
 *    the suggested row.
 *  - The list comes from MAIN. This file scans ArchSection.tsx and fails if
 *    any agent id appears in it.
 *  - An agent Tortie cannot offer is DRAWN rather than hidden, disabled,
 *    and every agent that shares a reason is named on ONE line.
 *  - A row the confirm gate refused CANNOT BE WRITTEN, even by calling the
 *    writer directly. That is the Settings half of the charter's attack:
 *    the pass may never run for an agent that was never confirmed.
 *  - Picking an agent here writes the `arch` key and NEVER the `fold` key,
 *    so the two agreements cannot bleed into each other from this page.
 *  - A write that main did not keep is reported rather than shown as if the
 *    choice were in force.
 *
 * This repository carries no jsdom, so the section renders through
 * `renderToStaticMarkup` and the two writers are called as functions.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ArchOptions } from '@shared/fold';
import type { GmuxSettings } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import {
  ArchSectionView,
  selectArchAgent,
  selectArchModel
} from '../ArchSection';
import { ARCH_SUGGESTED_MARK } from '../arch-copy';
import { useSettingsStore } from '../settings-store';

function options(): ArchOptions {
  return {
    harnesses: [
      {
        agentId: 'claude',
        agentLabel: 'Claude Code',
        models: [
          { id: 'small-model', label: 'Small' },
          { id: 'large-model', label: 'Large' }
        ],
        suggestedModel: 'small-model',
        available: true,
        reason: null,
        measuredOn: '2026-08-28'
      },
      {
        agentId: 'codex',
        agentLabel: 'Codex',
        models: [],
        suggestedModel: null,
        available: false,
        reason: 'not-measured',
        measuredOn: null
      },
      {
        agentId: 'grok',
        agentLabel: 'Grok CLI',
        models: [],
        suggestedModel: null,
        available: false,
        reason: 'not-measured',
        measuredOn: null
      },
      {
        agentId: 'cursor',
        agentLabel: 'Cursor CLI',
        models: [{ id: 'small-fast', label: 'Small' }],
        suggestedModel: 'small-fast',
        available: false,
        reason: 'not-confirmed',
        measuredOn: '2026-08-28'
      }
    ],
    suggestedAgentId: 'claude',
    suspended: null
  };
}

function draw(
  arch: GmuxSettings['arch'],
  over: Partial<ArchOptions> = {},
  dropped = false
): string {
  return renderToStaticMarkup(
    <ArchSectionView
      options={{ ...options(), ...over }}
      loaded={true}
      arch={arch}
      dropped={dropped}
      onAgent={() => undefined}
      onModel={() => undefined}
    />
  );
}

/** Stand the store up with a chosen arch harness and a recording writer. */
function stand(arch: GmuxSettings['arch'], keep: boolean): string[] {
  const wrote: string[] = [];
  useSettingsStore.setState({
    settings: { ...defaultGmuxSettings(), arch },
    settingsLoaded: true,
    archOptions: options(),
    archOptionsLoaded: true,
    async update(patch) {
      wrote.push(JSON.stringify(patch));
      const next: GmuxSettings = {
        ...useSettingsStore.getState().settings,
        ...patch,
        ...(keep ? {} : { arch: { agentId: null, model: null } })
      };
      useSettingsStore.setState({ settings: next });
      return next;
    }
  });
  return wrote;
}

afterEach(() => {
  useSettingsStore.setState({
    settings: defaultGmuxSettings(),
    archOptions: null,
    archOptionsLoaded: false
  });
});

describe('the picker on a fresh install', () => {
  it('shows None and applies nothing on its own', () => {
    const markup = draw({ agentId: null, model: null });
    expect(markup).toMatch(/<option value="" selected=""/);
  });

  it('marks the suggested row without choosing the row', () => {
    stand({ agentId: null, model: null }, true);
    const markup = draw({ agentId: null, model: null });
    expect(markup).toContain(`Claude Code${ARCH_SUGGESTED_MARK}`);
    expect(useSettingsStore.getState().settings.arch.agentId).toBeNull();
  });

  it('draws no model picker while nothing is chosen', () => {
    const markup = draw({ agentId: null, model: null });
    expect(markup).not.toContain('Large');
  });
});

describe('an agent Tortie cannot offer', () => {
  const markup = draw({ agentId: null, model: null });

  it('is drawn rather than hidden, disabled', () => {
    expect(markup).toContain('Codex');
    expect(markup).toMatch(/<option value="codex" disabled=""/);
  });

  it('is named with every other unmeasured agent on ONE line', () => {
    expect(markup).toContain('Not measured yet: Codex, Grok CLI.');
    expect(markup.split('Not measured yet').length - 1).toBe(1);
  });

  it('keeps an unconfirmed agent on its own line, sent to Agents', () => {
    expect(markup).toContain('Not confirmed yet: Cursor CLI.');
    expect(markup).toContain('Confirm under Agents');
  });

  it('cannot be written even by calling the writer directly', async () => {
    const wrote = stand({ agentId: null, model: null }, true);
    expect(await selectArchAgent('codex')).toBe(false);
    // The unconfirmed row is refused the same way. This is the Settings half
    // of the charter's attack: an agent whose confirm gate does not pass can
    // never even be STORED as the arch choice from this page, and main's
    // membership check and seal stand behind this refusal as well.
    expect(await selectArchAgent('cursor')).toBe(false);
    expect(wrote).toHaveLength(0);
    expect(useSettingsStore.getState().settings.arch.agentId).toBeNull();
  });
});

describe('picking an agent', () => {
  it('writes the pair and starts on the suggested model', async () => {
    const wrote = stand({ agentId: null, model: null }, true);
    expect(await selectArchAgent('claude')).toBe(true);
    expect(wrote).toHaveLength(1);
    expect(useSettingsStore.getState().settings.arch).toEqual({
      agentId: 'claude',
      model: 'small-model'
    });
  });

  it('writes the arch key and never the fold key', async () => {
    const wrote = stand({ agentId: null, model: null }, true);
    await selectArchAgent('claude');
    await selectArchModel('large-model');
    for (const patch of wrote) {
      expect(patch).toContain('"arch"');
      expect(patch).not.toContain('"fold"');
    }
    expect(useSettingsStore.getState().settings.fold).toEqual({
      agentId: null,
      model: null
    });
  });

  it('draws the model picker once an agent is chosen', () => {
    const markup = draw({ agentId: 'claude', model: 'small-model' });
    expect(markup).toContain('Small');
    expect(markup).toContain('Large');
  });

  it('changes the model against the agent already chosen', async () => {
    stand({ agentId: 'claude', model: 'small-model' }, true);
    expect(await selectArchModel('large-model')).toBe(true);
    expect(useSettingsStore.getState().settings.arch.model).toBe('large-model');
  });

  it('refuses a model pick while nothing is chosen', async () => {
    const wrote = stand({ agentId: null, model: null }, true);
    expect(await selectArchModel('small-model')).toBe(false);
    expect(wrote).toHaveLength(0);
  });

  it('refuses a model that agent does not expose', async () => {
    const wrote = stand({ agentId: 'claude', model: 'small-model' }, true);
    expect(await selectArchModel('a-model-nobody-measured')).toBe(false);
    expect(wrote).toHaveLength(0);
    expect(useSettingsStore.getState().settings.arch.model).toBe('small-model');
  });
});

describe('None stays valid forever', () => {
  it('is written back without asking main for a list', async () => {
    const wrote = stand({ agentId: 'claude', model: 'small-model' }, true);
    expect(await selectArchAgent('')).toBe(true);
    expect(wrote[0]).toContain('"agentId":null');
    expect(useSettingsStore.getState().settings.arch).toEqual({
      agentId: null,
      model: null
    });
  });
});

describe('a choice main did not keep', () => {
  it('does not stick, and the writer says so', async () => {
    stand({ agentId: null, model: null }, false);
    expect(await selectArchAgent('claude')).toBe(false);
    expect(useSettingsStore.getState().settings.arch.agentId).toBeNull();
  });

  it('is reported on the section rather than shown as in force', () => {
    const markup = draw({ agentId: null, model: null }, {}, true);
    expect(markup).toContain('Tortie did not keep that choice');
  });
});

describe('the pass suspended', () => {
  it("draws main's own sentence and nothing of its own", () => {
    const sentence = 'The pass is paused after repeated failures.';
    expect(
      draw({ agentId: 'claude', model: 'small-model' }, { suspended: sentence })
    ).toContain(sentence);
  });
});

describe('a build with no arch bridge', () => {
  it('says one sentence rather than drawing a dead picker', () => {
    const markup = renderToStaticMarkup(
      <ArchSectionView
        options={null}
        loaded={true}
        arch={{ agentId: null, model: null }}
        dropped={false}
        onAgent={() => undefined}
        onModel={() => undefined}
      />
    );
    expect(markup).toContain('This build cannot fill in the contract');
    expect(markup).not.toContain('<select');
  });
});

describe('the list is built in main', () => {
  const source = readFileSync(join(__dirname, '..', 'ArchSection.tsx'), 'utf8');

  /** Comments first, so the prose above may name an agent. */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  const IDS = [
    'claude',
    'codex',
    'cursor',
    'cursoride',
    'copilotide',
    'gemini',
    'droid',
    'deepseek',
    'antigravity',
    'muse',
    'qwen',
    'grok'
  ];

  for (const id of IDS) {
    it(`names no agent called ${id}`, () => {
      expect(code, `ArchSection.tsx hardcodes ${id}`).not.toContain(`'${id}'`);
      expect(code, `ArchSection.tsx hardcodes ${id}`).not.toContain(`"${id}"`);
    });
  }

  it('names no model either', () => {
    expect(code).not.toMatch(/haiku|sonnet|opus|gpt|gemini-/i);
  });
});

describe('just enough words, the ruling of 2026-08-28, run on the markup', () => {
  /** The page with everything inside the disclosure cut away, tags stripped. */
  function restingText(markup: string): string {
    return markup
      .replace(/<details[\s\S]*?<\/details>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#x27;/g, '’')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function fullStops(text: string): number {
    return (text.match(/\./g) ?? []).length;
  }

  it('says three sentences with an agent chosen and the rest unmeasured', () => {
    const markup = draw({ agentId: 'claude', model: 'small-model' }, {
      harnesses: options().harnesses.filter((h) => h.reason !== 'not-confirmed')
    });
    // The agent caption is one, the model caption is one, and the unmeasured
    // agents are one line rather than one each. The measured date is behind
    // the disclosure now.
    expect(fullStops(restingText(markup))).toBe(3);
  });

  it('adds one line, not one per agent, when a row is unconfirmed', () => {
    const markup = draw({ agentId: 'claude', model: 'small-model' });
    expect(fullStops(restingText(markup))).toBe(5);
  });

  it('holds the whole resting face under eighty words, options and all', () => {
    const markup = draw({ agentId: 'claude', model: 'small-model' });
    const text = restingText(markup);
    expect(text.split(/\s+/).length, text).toBeLessThanOrEqual(80);
  });

  it('renders no paragraph on the resting face', () => {
    const markup = draw({ agentId: 'claude', model: 'small-model' });
    const resting = markup.replace(/<details[\s\S]*?<\/details>/g, ' ');
    expect(resting).not.toContain('<p');
  });

  it('ships the disclosure SHUT, with the three sentences behind it', () => {
    const markup = draw({ agentId: 'claude', model: 'small-model' });
    const at = markup.indexOf('<details');
    expect(at).toBeGreaterThan(-1);
    expect(markup).not.toMatch(/<details[^>]*\bopen\b/);
    expect(markup.indexOf('What the agent does')).toBeGreaterThan(at);
    expect(markup.indexOf('Source Control')).toBeGreaterThan(at);
    expect(markup.indexOf('never because a file changed')).toBeGreaterThan(at);
  });

  it('keeps the measured date behind the disclosure too', () => {
    const markup = draw({ agentId: 'claude', model: 'small-model' });
    const at = markup.indexOf('<details');
    const date = markup.indexOf('Tortie measured these flags');
    expect(date).toBeGreaterThan(at);
  });

  it('still speaks in full when something has gone wrong', () => {
    // The ruling trims the resting face, never an error. A dropped write
    // says a whole sentence right on the card.
    const markup = draw({ agentId: null, model: null }, {}, true);
    const resting = markup.replace(/<details[\s\S]*?<\/details>/g, ' ');
    expect(resting).toContain('Tortie did not keep that choice');
  });
});
