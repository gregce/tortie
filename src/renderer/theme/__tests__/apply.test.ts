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
  chromeShade: 0,
  chromeDepth: 0,
  workAreaFont: 'system',
  workAreaFontCustom: '',
  colorScheme: 'dark'
};
const TEAL_HIGH: AppliedAppearance = {
  highlightScheme: 'teal',
  contrastLevel: 'high',
  chromeHue: 222,
  chromeShade: 0,
  chromeDepth: 0,
  workAreaFont: 'system',
  workAreaFontCustom: '',
  colorScheme: 'dark'
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
  systemDark: boolean;
  schemes: string[];
  transitions: boolean[];
} {
  const inline = new Map<string, string>();
  const reads: string[] = [];
  let writes = 0;
  const out = {
    inline,
    reads,
    writesBeforeFirstRead: 0,
    systemDark: true,
    schemes: [] as string[],
    transitions: [] as boolean[],
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
    publish: vi.fn(),
    groundLift: () => 0,
    removeProperty: (token) => {
      writes += 1;
      inline.delete(token);
    },
    refreshTerminals: out.refresh,
    setFont: out.setFont,
    derive: out.derive as unknown as AppearanceEnv['derive'],
    systemPrefersDark: () => out.systemDark,
    setScheme: (scheme) => {
      out.schemes.push(scheme);
    },
    transition: (commit, crossfade) => {
      out.transitions.push(crossfade);
      commit();
    }
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

  it('writes the --bg-canvas anchor only when the derivation hands it one', () => {
    // The scheme and the lift never derive a canvas (derive.test.ts pins
    // that); the hue does, at a hue other than 222, and the applier writes
    // whatever the derivation answered. What the applier itself never does
    // is invent one: a map without the key leaves the root without it.
    const f = fakeEnv({ '--accent': '#00aaaa' });
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    expect(f.inline.has('--bg-canvas')).toBe(false);
  });

  it('publishes the canvas in effect and the text polarity, before the refresh (Phase 207)', () => {
    const order: string[] = [];
    const f = fakeEnv({ '--accent': '#00aaaa', '--bg-canvas': '#171314' });
    f.env.publish = vi.fn(() => order.push('publish'));
    f.env.refreshTerminals = vi.fn(() => order.push('refresh'));
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    expect(order).toEqual(['publish', 'refresh']);
    const published = (f.env.publish as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | { overrides: Record<string, string>; canvas: string; textDark: boolean }
      | undefined;
    expect(published?.canvas).toBe('#171314');
    expect(published?.textDark).toBe(false);
    expect(published?.overrides['--accent']).toBe('#00aaaa');
    // The font tokens are not colour and never reach the store.
    expect(Object.keys(published?.overrides ?? {})).not.toContain('--font-terminal');
  });

  it('publishes the captured base canvas and light text at the defaults', () => {
    const f = fakeEnv({});
    const apply = createAppearanceApplier(f.env);
    apply(BLUE_NORMAL);
    const published = (f.env.publish as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as
      | { overrides: Record<string, string>; canvas: string; textDark: boolean }
      | undefined;
    expect(published?.overrides).toEqual({});
    expect(published?.canvas).toBe('#131417');
    expect(published?.textDark).toBe(false);
  });

  it('re-derives when the synthetic ground moves, appearance unchanged', () => {
    let lift = 0;
    const f = fakeEnv({ '--accent': '#00aaaa' });
    f.env.groundLift = () => lift;
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    apply(TEAL_HIGH);
    expect(f.derive).toHaveBeenCalledTimes(1);
    lift = 0.3;
    apply(TEAL_HIGH);
    expect(f.derive).toHaveBeenCalledTimes(2);
    expect(f.derive.mock.calls[1]?.[2]).toBe(0.3);
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

describe('the scheme (Phase 213)', () => {
  it('captures one base per scheme, crossfades only a change of base, and strips the dark base of its attribute', () => {
    const f = fakeEnv({ '--accent': '#00aaaa' });
    const apply = createAppearanceApplier(f.env);
    apply(BLUE_NORMAL);
    expect(f.schemes).toEqual(['dark']);
    expect(f.transitions).toEqual([false]);
    const readsAfterDark = f.reads.length;
    apply({ ...BLUE_NORMAL, colorScheme: 'light' });
    expect(f.schemes).toEqual(['dark', 'light']);
    expect(f.transitions).toEqual([false, true]);
    // The light base was captured fresh, one read per covered token.
    expect(f.reads.length).toBe(readsAfterDark * 2);
    const published = (f.env.publish as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as
      | { scheme: string }
      | undefined;
    expect(published?.scheme).toBe('light');
    // Back to dark: no new capture, a crossfade, the dark base again.
    apply(BLUE_NORMAL);
    expect(f.reads.length).toBe(readsAfterDark * 2);
    expect(f.transitions).toEqual([false, true, true]);
    expect(f.schemes).toEqual(['dark', 'light', 'dark']);
    // A hue change on the same base does not crossfade.
    apply({ ...BLUE_NORMAL, chromeHue: 40 });
    expect(f.transitions).toEqual([false, true, true, false]);
  });

  it('hands the base only a frame that base can draw, and gives it back on the way home', () => {
    // A shade of -2 at depth 2 is one of the 35 pairs the dark base offers
    // and one of the 31 it offers that paper cannot draw: applied whole on
    // paper it puts --accent-text under 4.5:1. The applier composes from the
    // nearest stop paper does offer, and persists nothing, so choosing Dark
    // again derives from the frame that was chosen.
    const f = fakeEnv({});
    const apply = createAppearanceApplier(f.env);
    const chosen = { ...TEAL_HIGH, chromeShade: -2, chromeDepth: 2 };
    const frameOf = (call: number): [number, number] => {
      const a = (f.derive as ReturnType<typeof vi.fn>).mock.calls[call]?.[0] as Appearance;
      return [a.chromeShade, a.chromeDepth];
    };
    apply(chosen);
    expect(frameOf(0)).toEqual([-2, 2]);
    apply({ ...chosen, colorScheme: 'light' });
    expect(frameOf(1)).toEqual([0, 0]);
    apply(chosen);
    expect(frameOf(2)).toEqual([-2, 2]);
  });

  it('resolves system through the environment and re-derives when the Mac flips', () => {
    const f = fakeEnv({});
    const apply = createAppearanceApplier(f.env);
    f.systemDark = true;
    apply({ ...BLUE_NORMAL, colorScheme: 'system' });
    expect(f.schemes).toEqual(['dark']);
    f.systemDark = false;
    apply({ ...BLUE_NORMAL, colorScheme: 'system' });
    expect(f.schemes).toEqual(['dark', 'light']);
    expect(f.transitions.at(-1)).toBe(true);
    // The same appearance and the same Mac answer is the JSON skip.
    apply({ ...BLUE_NORMAL, colorScheme: 'system' });
    expect(f.schemes).toEqual(['dark', 'light']);
  });

  it('removes every inline override before it captures the other base', () => {
    const f = fakeEnv({ '--accent': '#00aaaa', '--bg-surface': '#22262c' });
    const apply = createAppearanceApplier(f.env);
    apply(TEAL_HIGH);
    expect(f.inline.size).toBe(2);
    let inlineAtCapture = -1;
    const read = f.env.readBaseValue;
    f.env.readBaseValue = (token) => {
      if (inlineAtCapture === -1) inlineAtCapture = f.inline.size;
      return read(token);
    };
    apply({ ...TEAL_HIGH, colorScheme: 'light' });
    expect(inlineAtCapture).toBe(0);
    expect(f.inline.size).toBe(2);
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
