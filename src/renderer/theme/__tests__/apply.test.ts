/**
 * Phase 62 — the appearance applier and the terminal refresh.
 *
 * What these tests hold:
 * - A non-default appearance writes the derived properties inline, and
 *   switching back to the defaults removes every one of them, leaving zero
 *   inline custom properties.
 * - Phase 78: the font half rides the same mechanism. A bundled preset adds
 *   exactly `--font-terminal` and `--font-editor` on top of the colour map,
 *   the System preset adds nothing, and going back to System removes both.
 *   The chosen preset reaches the store xterm and Monaco watch.
 * - Applying the same appearance twice derives once (the JSON-compare skip).
 * - The base is captured once, before any write, and includes the scheme
 *   family, the contrast lists and the `--bg-canvas` anchor.
 * - `forEachTerminal` visits every registered terminal and stops visiting an
 *   unregistered one.
 * - `refreshLiveTerminalThemes` assigns `options.theme` on a live terminal,
 *   and the resolved theme's selection color follows `--terminal-selection`
 *   when the token is set.
 *
 * The vitest environment is node, so the applier runs against an injected
 * environment instead of a real DOM, and the terminal refresh runs against
 * stubbed `document` and `getComputedStyle` globals.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Terminal } from '@xterm/xterm';
import {
  forEachTerminal,
  registerTerminal
} from '../../terminal/drop/registry';
import { resolveTerminalTheme, terminalTheme } from '../../terminal/theme';
import type { Appearance } from '../derive';
import {
  createAppearanceApplier,
  initAppearance,
  refreshLiveTerminalThemes,
  type AppliedAppearance,
  type AppearanceEnv
} from '../apply';

const BLUE_NORMAL: AppliedAppearance = {
  highlightScheme: 'blue',
  contrastLevel: 'normal',
  chromeHue: 222,
  workAreaFont: 'system',
  workAreaFontCustom: ''
};
const TEAL_HIGH: AppliedAppearance = {
  highlightScheme: 'teal',
  contrastLevel: 'high',
  chromeHue: 222,
  workAreaFont: 'system',
  workAreaFontCustom: ''
};
const BLUE_NORMAL_JETBRAINS: AppliedAppearance = {
  ...BLUE_NORMAL,
  workAreaFont: 'jetbrains-mono'
};
const JETBRAINS_STACK = "'JetBrains Mono', Menlo, monospace";

/**
 * A fake environment: inline properties live in a Map, the derivation is a
 * canned function (empty for the defaults, like the real one), and every
 * collaborator is a spy.
 */
function fakeEnv(derived: Record<string, string>): {
  env: AppearanceEnv;
  inline: Map<string, string>;
  derive: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  setFont: ReturnType<typeof vi.fn>;
  reads: string[];
  writesBeforeFirstRead: number;
} {
  const inline = new Map<string, string>();
  const reads: string[] = [];
  let writes = 0;
  const out = {
    inline,
    reads,
    writesBeforeFirstRead: 0,
    derive: vi.fn((appearance: Appearance, _base: Record<string, string>) =>
      appearance.highlightScheme === 'blue' &&
      appearance.contrastLevel === 'normal'
        ? {}
        : derived
    ),
    refresh: vi.fn(),
    setFont: vi.fn(),
    env: undefined as unknown as AppearanceEnv
  };
  out.env = {
    readBaseValue: (token) => {
      if (reads.length === 0) out.writesBeforeFirstRead = writes;
      reads.push(token);
      return '#131417';
    },
    setProperty: (token, value) => {
      writes += 1;
      inline.set(token, value);
    },
    setCustomFont: vi.fn(),
    removeProperty: (token) => {
      writes += 1;
      inline.delete(token);
    },
    refreshTerminals: out.refresh,
    setFont: out.setFont,
    derive: out.derive as unknown as AppearanceEnv['derive']
  };
  return out;
}

describe('the appearance applier', () => {
  it('writes the derived properties inline for a non-default appearance', () => {
    const f = fakeEnv({ '--accent': '#00aaaa', '--bg-surface': '#22262c' });
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    expect(f.inline.get('--accent')).toBe('#00aaaa');
    expect(f.inline.get('--bg-surface')).toBe('#22262c');
    expect(f.refresh).toHaveBeenCalledTimes(1);
  });

  it('leaves zero inline properties after switching back to the defaults', () => {
    const f = fakeEnv({ '--accent': '#00aaaa', '--bg-surface': '#22262c' });
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    expect(f.inline.size).toBe(2);
    apply(BLUE_NORMAL);
    expect(f.inline.size).toBe(0);
  });

  it('derives once when the same appearance is applied twice', () => {
    const f = fakeEnv({ '--accent': '#00aaaa' });
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    apply({ ...TEAL_HIGH });
    expect(f.derive).toHaveBeenCalledTimes(1);
    expect(f.refresh).toHaveBeenCalledTimes(1);
  });

  it('captures the base once, before any write, anchor included', () => {
    const f = fakeEnv({ '--accent': '#00aaaa' });
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    apply(BLUE_NORMAL);
    // One read per covered token, never re-read on the second apply.
    expect(f.reads.length).toBe(new Set(f.reads).size);
    expect(f.writesBeforeFirstRead).toBe(0);
    expect(f.reads).toContain('--accent');
    expect(f.reads).toContain('--terminal-selection');
    expect(f.reads).toContain('--bg-canvas');
    const base = f.derive.mock.calls[0]?.[1] as
      | Record<string, string>
      | undefined;
    expect(base?.['--bg-canvas']).toBe('#131417');
  });

  it('never writes the --bg-canvas anchor', () => {
    const f = fakeEnv({ '--accent': '#00aaaa' });
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    expect(f.inline.has('--bg-canvas')).toBe(false);
  });
});

describe('the work-area font half (Phase 78)', () => {
  it('writes nothing at all for the System preset', () => {
    const f = fakeEnv({});
    const apply = createAppearanceApplier(f.env);
    apply(BLUE_NORMAL);
    expect(f.inline.size).toBe(0);
  });

  it('adds exactly the two font tokens for a bundled preset', () => {
    const f = fakeEnv({});
    const apply = createAppearanceApplier(f.env);
    apply(BLUE_NORMAL_JETBRAINS);
    expect([...f.inline.keys()].sort()).toEqual([
      '--font-editor',
      '--font-terminal'
    ]);
    expect(f.inline.get('--font-terminal')).toBe(JETBRAINS_STACK);
    expect(f.inline.get('--font-editor')).toBe(JETBRAINS_STACK);
  });

  it('removes both tokens on the way back to System', () => {
    const f = fakeEnv({});
    const apply = createAppearanceApplier(f.env);
    apply(BLUE_NORMAL_JETBRAINS);
    expect(f.inline.size).toBe(2);
    apply(BLUE_NORMAL);
    expect(f.inline.size).toBe(0);
  });

  it('keeps the colour overrides beside the font overrides', () => {
    const f = fakeEnv({ '--accent': '#00aaaa' });
    const apply = createAppearanceApplier(f.env);
    apply({ ...TEAL_HIGH, workAreaFont: 'source-code-pro' });
    expect(f.inline.get('--accent')).toBe('#00aaaa');
    expect(f.inline.get('--font-terminal')).toBe(
      "'Source Code Pro', Menlo, monospace"
    );
  });

  it('re-applies when only the font changed', () => {
    const f = fakeEnv({});
    const apply = createAppearanceApplier(f.env);
    apply(BLUE_NORMAL);
    apply(BLUE_NORMAL_JETBRAINS);
    expect(f.derive).toHaveBeenCalledTimes(2);
    expect(f.inline.get('--font-terminal')).toBe(JETBRAINS_STACK);
  });

  it('publishes the preset to the store xterm and Monaco watch', () => {
    const f = fakeEnv({});
    const apply = createAppearanceApplier(f.env);
    apply(BLUE_NORMAL_JETBRAINS);
    expect(f.setFont).toHaveBeenCalledWith('jetbrains-mono');
  });
});

describe('initAppearance', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it('does nothing on an older preload without the settings bridge', () => {
    (globalThis as { window?: unknown }).window = { gmux: {} };
    expect(() => initAppearance()).not.toThrow();
  });
});

describe('forEachTerminal and the theme refresh', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** A fake xterm: only the options bag the refresh writes to. */
  function fakeTerm(): { options: { theme?: unknown } } {
    return { options: {} };
  }

  it('visits every registered terminal and forgets an unregistered one', () => {
    const a = fakeTerm();
    const b = fakeTerm();
    const offA = registerTerminal('p62-a', a as unknown as Terminal);
    const offB = registerTerminal('p62-b', b as unknown as Terminal);
    try {
      let visits = 0;
      forEachTerminal(() => {
        visits += 1;
      });
      expect(visits).toBe(2);
      offA();
      visits = 0;
      forEachTerminal(() => {
        visits += 1;
      });
      expect(visits).toBe(1);
    } finally {
      offA();
      offB();
    }
  });

  it('refreshLiveTerminalThemes assigns options.theme on a live terminal', () => {
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: () => ''
    }));
    const term = fakeTerm();
    const off = registerTerminal('p62-c', term as unknown as Terminal);
    try {
      refreshLiveTerminalThemes();
      expect(term.options.theme).toBeDefined();
      expect(
        (term.options.theme as { selectionBackground?: string })
          .selectionBackground
      ).toBe(terminalTheme.selectionBackground);
    } finally {
      off();
    }
  });

  it('the resolved theme follows --terminal-selection when the token is set', () => {
    vi.stubGlobal('document', { documentElement: {} });
    vi.stubGlobal('getComputedStyle', () => ({
      getPropertyValue: (name: string) =>
        name === '--terminal-selection' ? 'rgba(1, 2, 3, 0.5)' : ''
    }));
    const theme = resolveTerminalTheme();
    expect(theme.selectionBackground).toBe('rgba(1, 2, 3, 0.5)');
    // The carve-out is the selection alone: everything else keeps the
    // shipped constants when its token is absent.
    expect(theme.background).toBe(terminalTheme.background);
    expect(theme.foreground).toBe(terminalTheme.foreground);
  });
});
