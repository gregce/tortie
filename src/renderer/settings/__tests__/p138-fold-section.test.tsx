/**
 * Settings then Project line (Phase 138), run rather than read.
 *
 * Four refusals are held here.
 *
 *  - None is the shipped answer and it is what the picker shows on a fresh
 *    install. Nothing is applied on its own, not even the suggested row.
 *  - The list comes from MAIN. This file scans FoldSection.tsx and fails if
 *    any agent id appears in it, so the picker can never grow a hardcoded
 *    array that drifts from the registry.
 *  - An agent Tortie cannot offer is DRAWN and disabled with main's own
 *    sentence beside it, rather than hidden.
 *  - A write that main did not keep is reported rather than shown as if the
 *    choice were in force. That is what the danger seal does to a fold choice
 *    that did not come from this window.
 *
 * This repository carries no jsdom, so the section renders through
 * `renderToStaticMarkup` and the two writers are called as functions.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type { FoldOptions } from '@shared/fold';
import type { GmuxSettings } from '@shared/settings';
import { defaultGmuxSettings } from '@shared/settings';
import {
  FoldSectionView,
  firstFoldModel,
  foldHarnessById,
  selectFoldAgent,
  selectFoldModel
} from '../FoldSection';
import { FOLD_NONE_OPTION, FOLD_SUGGESTED_MARK } from '../fold-copy';
import { useSettingsStore } from '../settings-store';

const NOT_MEASURED =
  'Tortie has not measured a one shot recipe for this agent yet.';

function options(): FoldOptions {
  return {
    harnesses: [
      {
        agentId: 'claude',
        agentLabel: 'Claude Code',
        models: [
          { id: 'haiku-small', label: 'Haiku' },
          { id: 'sonnet-mid', label: 'Sonnet' }
        ],
        suggestedModel: 'haiku-small',
        available: true,
        reason: null,
        measuredOn: '2026-08-23'
      },
      {
        agentId: 'codex',
        agentLabel: 'Codex',
        models: [],
        suggestedModel: null,
        available: false,
        reason: NOT_MEASURED,
        measuredOn: null
      }
    ],
    suggestedAgentId: 'claude',
    suspended: null
  };
}

/**
 * The section drawn for one state. The view takes props rather than reading
 * the store, because the server renderer answers a zustand hook with the
 * store's INITIAL state and a store backed component could only ever be
 * tested on its defaults.
 */
function draw(
  fold: GmuxSettings['fold'],
  over: Partial<FoldOptions> = {},
  dropped = false
): string {
  return renderToStaticMarkup(
    <FoldSectionView
      options={{ ...options(), ...over }}
      loaded={true}
      fold={fold}
      dropped={dropped}
      onAgent={() => undefined}
      onModel={() => undefined}
    />
  );
}

/** Stand the store up with a chosen fold and a recording writer. */
function stand(fold: GmuxSettings['fold'], keep: boolean): string[] {
  const wrote: string[] = [];
  useSettingsStore.setState({
    settings: { ...defaultGmuxSettings(), fold },
    settingsLoaded: true,
    foldOptions: options(),
    foldOptionsLoaded: true,
    async update(patch) {
      wrote.push(JSON.stringify(patch));
      const next: GmuxSettings = {
        ...useSettingsStore.getState().settings,
        ...patch,
        // Main drops a pair its seal does not cover. `keep` is which of the
        // two answers main gives back.
        ...(keep ? {} : { fold: { agentId: null, model: null } })
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
    foldOptions: null,
    foldOptionsLoaded: false
  });
});

describe('the picker on a fresh install', () => {
  it('shows None and applies nothing on its own', () => {
    const markup = draw({ agentId: null, model: null });
    expect(markup).toContain(FOLD_NONE_OPTION);
    // The select renders its chosen option with `selected`, and the chosen
    // one is None, whose value is the empty string.
    expect(markup).toMatch(/<option value="" selected=""/);
  });

  it('marks the suggested row without choosing the row', () => {
    stand({ agentId: null, model: null }, true);
    const markup = draw({ agentId: null, model: null });
    expect(markup).toContain(`Claude Code${FOLD_SUGGESTED_MARK}`);
    expect(useSettingsStore.getState().settings.fold.agentId).toBeNull();
  });

  it('draws no model picker while nothing is chosen', () => {
    const markup = draw({ agentId: null, model: null });
    expect(markup).not.toContain('Haiku');
  });
});

describe('an agent Tortie cannot offer', () => {
  const markup = draw({ agentId: null, model: null });

  it('is drawn rather than hidden', () => {
    expect(markup).toContain('Codex');
  });

  it('is disabled in the picker', () => {
    expect(markup).toMatch(/<option value="codex" disabled=""/);
  });

  it("carries main's own sentence for why", () => {
    expect(markup).toContain(NOT_MEASURED);
  });

  it('cannot be written even by calling the writer directly', async () => {
    const wrote = stand({ agentId: null, model: null }, true);
    expect(await selectFoldAgent('codex')).toBe(false);
    expect(wrote).toHaveLength(0);
    expect(useSettingsStore.getState().settings.fold.agentId).toBeNull();
  });
});

describe('picking an agent', () => {
  it('writes the pair and starts on the suggested model', async () => {
    const wrote = stand({ agentId: null, model: null }, true);
    expect(await selectFoldAgent('claude')).toBe(true);
    expect(wrote).toHaveLength(1);
    expect(useSettingsStore.getState().settings.fold).toEqual({
      agentId: 'claude',
      model: 'haiku-small'
    });
  });

  it('draws the model picker once an agent is chosen', () => {
    const markup = draw({ agentId: 'claude', model: 'haiku-small' });
    expect(markup).toContain('Haiku');
    expect(markup).toContain('Sonnet');
  });

  it('changes the model against the agent already chosen', async () => {
    stand({ agentId: 'claude', model: 'haiku-small' }, true);
    expect(await selectFoldModel('sonnet-mid')).toBe(true);
    expect(useSettingsStore.getState().settings.fold.model).toBe('sonnet-mid');
  });

  it('refuses a model pick while nothing is chosen', async () => {
    const wrote = stand({ agentId: null, model: null }, true);
    expect(await selectFoldModel('haiku-small')).toBe(false);
    expect(wrote).toHaveLength(0);
  });

  it('refuses a model that agent does not expose', async () => {
    const wrote = stand({ agentId: 'claude', model: 'haiku-small' }, true);
    expect(await selectFoldModel('a-model-nobody-measured')).toBe(false);
    expect(wrote).toHaveLength(0);
    expect(useSettingsStore.getState().settings.fold.model).toBe('haiku-small');
  });
});

describe('None stays valid forever', () => {
  it('is written back without asking main for a list', async () => {
    const wrote = stand({ agentId: 'claude', model: 'haiku-small' }, true);
    expect(await selectFoldAgent('')).toBe(true);
    expect(wrote[0]).toContain('"agentId":null');
    expect(useSettingsStore.getState().settings.fold).toEqual({
      agentId: null,
      model: null
    });
  });
});

describe('a choice main did not keep', () => {
  it('does not stick, and the writer says so', async () => {
    stand({ agentId: null, model: null }, false);
    expect(await selectFoldAgent('claude')).toBe(false);
    expect(useSettingsStore.getState().settings.fold.agentId).toBeNull();
  });

  it('is reported on the section rather than shown as in force', () => {
    const markup = draw({ agentId: null, model: null }, {}, true);
    expect(markup).toContain('Tortie did not keep that choice');
  });
});

describe('folding suspended', () => {
  it("draws main's own sentence and nothing of its own", () => {
    const sentence = 'Folding is paused until your usage window resets.';
    expect(
      draw({ agentId: 'claude', model: 'haiku-small' }, {
        suspended: sentence
      })
    ).toContain(sentence);
  });
});

describe('a build with no fold bridge', () => {
  it('says one sentence rather than drawing a dead picker', () => {
    const markup = renderToStaticMarkup(
      <FoldSectionView
        options={null}
        loaded={true}
        fold={{ agentId: null, model: null }}
        dropped={false}
        onAgent={() => undefined}
        onModel={() => undefined}
      />
    );
    expect(markup).toContain('This build cannot write the project line');
    expect(markup).not.toContain('<select');
  });
});

describe('the list is built in main', () => {
  const source = readFileSync(
    join(__dirname, '..', 'FoldSection.tsx'),
    'utf8'
  );

  /** Comments first, so the prose above may name an agent. */
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

  // Every id src/renderer/state/agents.ts seeds, plus the two that cannot be
  // a Tortie session. A hardcoded picker would name at least one of them.
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
      expect(code, `FoldSection.tsx hardcodes ${id}`).not.toContain(`'${id}'`);
      expect(code, `FoldSection.tsx hardcodes ${id}`).not.toContain(`"${id}"`);
    });
  }

  it('names no model either', () => {
    expect(code).not.toMatch(/haiku|sonnet|opus|gpt|gemini-/i);
  });
});

describe('the two pure helpers', () => {
  it('finds a row by its id and answers undefined for None', () => {
    expect(foldHarnessById(options(), 'claude')?.agentLabel).toBe(
      'Claude Code'
    );
    expect(foldHarnessById(options(), null)).toBeUndefined();
    expect(foldHarnessById(null, 'claude')).toBeUndefined();
  });

  it('starts on the suggested model, and on the first when there is none', () => {
    const rows = options().harnesses;
    expect(firstFoldModel(rows[0]!)).toBe('haiku-small');
    expect(
      firstFoldModel({ ...rows[0]!, suggestedModel: null })
    ).toBe('haiku-small');
    expect(firstFoldModel(rows[1]!)).toBeNull();
  });
});
