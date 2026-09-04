/**
 * Appearance persistence (Phase 62, plus the work area font in Phase 78).
 * Sanitize plus a store round trip.
 *
 * The three fields are preferences with no danger semantics. They never touch
 * the danger seal. What is pinned here:
 * - a value outside the union falls back to the default, whatever its type;
 * - a valid value survives sanitize, a patch, a disk write and a fresh load;
 * - an old settings file without these keys loads as the defaults;
 * - the file that lands on disk carries all three fields, so the next load
 *   does not depend on defaults being re-derived.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { windowBackgroundFor } from '@shared/chrome-hue';

let userDataDir = '';

// The two electron surfaces store.ts touches, following the fake in
// danger-seal.test.ts. No test here stores a danger value, so the keystore
// half exists only so the module loads.
/**
 * A fake nativeTheme (Phase 213): what the Mac says, settable, with the
 * `updated` listeners the chrome module subscribes to, so Match the Mac can
 * be driven without an OS.
 */
const fakeTheme = {
  shouldUseDarkColors: true,
  listeners: new Set<() => void>(),
  on(_event: string, cb: () => void): void {
    fakeTheme.listeners.add(cb);
  },
  off(_event: string, cb: () => void): void {
    fakeTheme.listeners.delete(cb);
  },
  flip(dark: boolean): void {
    fakeTheme.shouldUseDarkColors = dark;
    for (const cb of fakeTheme.listeners) cb();
  }
};

vi.mock('electron', () => ({
  nativeTheme: fakeTheme,
  app: {
    isReady: () => true,
    getPath: (name: string) => {
      if (name !== 'userData') throw new Error(`unexpected path: ${name}`);
      return userDataDir;
    }
  },
  safeStorage: {
    isEncryptionAvailable: (): boolean => true,
    encryptString: (text: string): Buffer =>
      Buffer.from(`sealed\u0000${text}`, 'utf8'),
    decryptString: (buf: Buffer): string => {
      const text = buf.toString('utf8');
      if (!text.startsWith('sealed\u0000')) throw new Error('not our key');
      return text.slice('sealed\u0000'.length);
    }
  }
}));

type Store = typeof import('../store');

/** A fresh module instance, so the per-run load cache starts empty. */
async function freshStore(): Promise<Store> {
  vi.resetModules();
  return import('../store');
}

beforeEach(() => {
  userDataDir = mkdtempSync(join(tmpdir(), 'p62-appearance-'));
});

afterEach(() => {
  rmSync(userDataDir, { recursive: true, force: true });
});

describe('the scheme (Phase 213)', () => {
  it('garbage of every shape reads as dark, and the three values survive', async () => {
    const store = await freshStore();
    for (const bad of ['paper', 'Light', 'LIGHT', 'auto', 3, null, undefined, {}, [], true]) {
      expect(store.sanitizeSettings({ colorScheme: bad }).colorScheme, JSON.stringify(bad)).toBe('dark');
    }
    for (const good of ['light', 'dark', 'system'] as const) {
      expect(store.sanitizeSettings({ colorScheme: good }).colorScheme).toBe(good);
    }
    expect(store.sanitizeSettings({}).colorScheme).toBe('dark');
  });

  it('round trips through a patch, the disk and a fresh load', async () => {
    const store = await freshStore();
    expect(store.getSettings().colorScheme).toBe('dark');
    store.updateSettings({ colorScheme: 'light' });
    const file = JSON.parse(readFileSync(join(userDataDir, 'settings.json'), 'utf8')) as {
      settings: { colorScheme: string };
    };
    expect(file.settings.colorScheme).toBe('light');
    const again = await freshStore();
    expect(again.getSettings().colorScheme).toBe('light');
    // A hand edit to a value that is not a scheme comes back as dark.
    file.settings.colorScheme = 'paper';
    writeFileSync(join(userDataDir, 'settings.json'), JSON.stringify(file), 'utf8');
    const third = await freshStore();
    expect(third.getSettings().colorScheme).toBe('dark');
  });
});

describe('sanitize', () => {
  it('values outside the union fall back to the defaults', async () => {
    const store = await freshStore();
    for (const bad of ['magenta', 'BLUE', 'Teal', 3, null, undefined, {}, []]) {
      const out = store.sanitizeSettings({
        highlightScheme: bad,
        contrastLevel: bad,
        workAreaFont: bad
      });
      expect(out.highlightScheme, JSON.stringify(bad)).toBe('blue');
      expect(out.contrastLevel, JSON.stringify(bad)).toBe('normal');
      expect(out.workAreaFont, JSON.stringify(bad)).toBe('system');
    }
  });

  it('every valid value survives sanitize', async () => {
    const store = await freshStore();
    for (const highlightScheme of ['blue', 'teal', 'purple', 'slate']) {
      for (const contrastLevel of ['normal', 'raised', 'high']) {
        for (const workAreaFont of [
          'system',
          'jetbrains-mono',
          'source-code-pro'
        ]) {
          const out = store.sanitizeSettings({
            highlightScheme,
            contrastLevel,
            workAreaFont
          });
          expect(out.highlightScheme).toBe(highlightScheme);
          expect(out.contrastLevel).toBe(contrastLevel);
          expect(out.workAreaFont).toBe(workAreaFont);
        }
      }
    }
  });

  it('a font id outside the union falls back to system', async () => {
    const store = await freshStore();
    for (const bad of [
      'JetBrains Mono',
      'jetbrains_mono',
      'menlo',
      'blue',
      '',
      ' system'
    ]) {
      const out = store.sanitizeSettings({ workAreaFont: bad });
      expect(out.workAreaFont, JSON.stringify(bad)).toBe('system');
    }
  });

  it('an invalid patch value falls back rather than sticking', async () => {
    const store = await freshStore();
    const current = store.getSettings();
    const next = store.applySettingsPatch(current, {
      highlightScheme: 'neon' as never,
      contrastLevel: 'maximum' as never,
      workAreaFont: 'comic-sans' as never
    });
    expect(next.highlightScheme).toBe('blue');
    expect(next.contrastLevel).toBe('normal');
    expect(next.workAreaFont).toBe('system');
  });
});

describe('the store round trip', () => {
  it('a valid value survives a write and a fresh load', async () => {
    const first = await freshStore();
    first.updateSettings({
      highlightScheme: 'purple',
      contrastLevel: 'raised',
      workAreaFont: 'jetbrains-mono'
    });

    // What landed on disk carries all three fields explicitly.
    const onDisk = JSON.parse(
      readFileSync(join(userDataDir, 'settings.json'), 'utf8')
    ) as { settings: Record<string, unknown> };
    expect(onDisk.settings['highlightScheme']).toBe('purple');
    expect(onDisk.settings['contrastLevel']).toBe('raised');
    expect(onDisk.settings['workAreaFont']).toBe('jetbrains-mono');

    const second = await freshStore();
    const settings = second.getSettings();
    expect(settings.highlightScheme).toBe('purple');
    expect(settings.contrastLevel).toBe('raised');
    expect(settings.workAreaFont).toBe('jetbrains-mono');
  });

  it('an old settings file without these keys loads as the defaults', async () => {
    writeFileSync(
      join(userDataDir, 'settings.json'),
      JSON.stringify({
        version: 1,
        settings: { defaultAgent: 'claude', scrollbackLines: 25000 }
      })
    );
    const store = await freshStore();
    const settings = store.getSettings();
    expect(settings.highlightScheme).toBe('blue');
    expect(settings.contrastLevel).toBe('normal');
    expect(settings.workAreaFont).toBe('system');
  });

  it('a hand-edited file with garbage values loads as the defaults', async () => {
    writeFileSync(
      join(userDataDir, 'settings.json'),
      JSON.stringify({
        version: 1,
        settings: {
          defaultAgent: 'claude',
          highlightScheme: 'hotdog-stand',
          contrastLevel: 11,
          workAreaFont: { family: 'Comic Sans MS' }
        }
      })
    );
    const store = await freshStore();
    const settings = store.getSettings();
    expect(settings.highlightScheme).toBe('blue');
    expect(settings.contrastLevel).toBe('normal');
    expect(settings.workAreaFont).toBe('system');
  });

  it('a valid font id survives a write and a fresh load on its own', async () => {
    const first = await freshStore();
    first.updateSettings({ workAreaFont: 'source-code-pro' });
    const second = await freshStore();
    const settings = second.getSettings();
    expect(settings.workAreaFont).toBe('source-code-pro');
    // The one-field patch moved nothing else.
    expect(settings.highlightScheme).toBe('blue');
    expect(settings.contrastLevel).toBe('normal');
  });
});

describe('the custom family (Phase 174)', () => {
  // The one character class every downstream sink must never receive: a quote
  // or backslash that could end the `'…'` stack, a semicolon or brace that
  // could start a new declaration, a bracket that could open url(), and any
  // control character. The persisted family is the value the renderer feeds to
  // the CSS custom property, xterm, Monaco and the capture SVG, so it is the
  // one place to prove hostile bytes never survive.
  const DANGEROUS = /["'`\\;{}()[\]<>]|[\u0000-\u001F\u007F-\u009F]/;

  it('a plain family survives sanitize untouched', async () => {
    const store = await freshStore();
    for (const family of ['Berkeley Mono', 'Fira Code', 'M+ 1m', 'Noto Sans CJK JP']) {
      const out = store.sanitizeSettings({ workAreaFontCustom: family });
      expect(out.workAreaFontCustom, family).toBe(family);
    }
  });

  it('strips quotes a person pasted around, and any quote inside', async () => {
    const store = await freshStore();
    expect(
      store.sanitizeSettings({ workAreaFontCustom: '"Berkeley Mono"' }).workAreaFontCustom
    ).toBe('Berkeley Mono');
    expect(
      store.sanitizeSettings({ workAreaFontCustom: "'Fira Code'" }).workAreaFontCustom
    ).toBe('Fira Code');
    expect(
      store.sanitizeSettings({ workAreaFontCustom: 'Fi"ra Co\'de' }).workAreaFontCustom
    ).toBe('Fira Code');
  });

  it('no hostile shape survives with a dangerous character intact', async () => {
    const store = await freshStore();
    const NL = String.fromCharCode(10);
    const TAB = String.fromCharCode(9);
    const CR = String.fromCharCode(13);
    const ESC = String.fromCharCode(27);
    const NUL = String.fromCharCode(0);
    const attacks: string[] = [
      "a'; color:red; } body{display:none} foo",
      'url(https://evil.example/x.woff2)',
      'a{}<script>alert(1)</script>b',
      'back\\slash',
      'semi;colon',
      'brace{here}',
      `line${NL}break${TAB}tab${CR}cr`,
      `esc${ESC}[31mred`,
      `nul${NUL}byte`
    ];
    for (const attack of attacks) {
      const out = store.sanitizeSettings({ workAreaFontCustom: attack }).workAreaFontCustom;
      expect(DANGEROUS.test(out), `${JSON.stringify(attack)} -> ${JSON.stringify(out)}`).toBe(
        false
      );
    }
  });

  it('an empty or whitespace-only family reads as none', async () => {
    const store = await freshStore();
    expect(store.sanitizeSettings({ workAreaFontCustom: '' }).workAreaFontCustom).toBe('');
    expect(store.sanitizeSettings({ workAreaFontCustom: '   ' }).workAreaFontCustom).toBe('');
    expect(store.sanitizeSettings({ workAreaFontCustom: '<>{}' }).workAreaFontCustom).toBe('');
  });

  it('a non-string family, or none at all, reads as empty', async () => {
    const store = await freshStore();
    for (const bad of [42, null, undefined, {}, []]) {
      expect(store.sanitizeSettings({ workAreaFontCustom: bad }).workAreaFontCustom).toBe('');
    }
    expect(store.sanitizeSettings({}).workAreaFontCustom).toBe('');
  });

  it('a pathological long paste is capped, never passed on whole', async () => {
    const store = await freshStore();
    const out = store.sanitizeSettings({ workAreaFontCustom: 'x'.repeat(4000) }).workAreaFontCustom;
    expect(out.length).toBeLessThanOrEqual(64);
  });

  // Phase 174.1's fix round. A family name now arrives from a FONT FILE as well
  // as from a keyboard, and a file can carry characters a keyboard will not. A
  // name holding U+202E draws its own row in the suggestion dropdown backwards,
  // and a zero width character makes two different rows look identical. Neither
  // can be seen, so neither can be judged, and both are stripped.
  it('an invisible direction or zero width control never survives', async () => {
    const store = await freshStore();
    const RLO = String.fromCharCode(0x202e);
    const LRO = String.fromCharCode(0x202d);
    const PDF = String.fromCharCode(0x202c);
    const RLI = String.fromCharCode(0x2067);
    const ZWSP = String.fromCharCode(0x200b);
    const ZWJ = String.fromCharCode(0x200d);
    const LRM = String.fromCharCode(0x200e);
    const BOM = String.fromCharCode(0xfeff);
    const WJ = String.fromCharCode(0x2060);
    const LS = String.fromCharCode(0x2028);
    // Phase 197 item 10: U+061C is the one Bidi_Control character outside the
    // two ranges, and at the parent commit it survived the sanitizer whole.
    const ALM = String.fromCharCode(0x061c);
    const INVISIBLE =
      /[\u061C\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u206F\uFEFF]/;
    const attacks: string[] = [
      `Men${ALM}lo`,
      `Men${RLO}lo`,
      `${RLO}Menlo${PDF}`,
      `${LRO}Berkeley Mono`,
      `${RLI}Fira Code`,
      `Men${ZWSP}lo`,
      `Men${ZWJ}lo`,
      `${LRM}Menlo`,
      `${BOM}Menlo`,
      `Men${WJ}lo`,
      `Men${LS}lo`
    ];
    for (const attack of attacks) {
      const out = store.sanitizeSettings({ workAreaFontCustom: attack })
        .workAreaFontCustom;
      expect(
        INVISIBLE.test(out),
        `${JSON.stringify(attack)} -> ${JSON.stringify(out)}`
      ).toBe(false);
      expect(DANGEROUS.test(out)).toBe(false);
    }
    // And the visible name that was hiding behind them is what is left.
    expect(
      store.sanitizeSettings({ workAreaFontCustom: `Men${RLO}lo` })
        .workAreaFontCustom
    ).toBe('Menlo');
  });

  it('a clean custom family survives a write and a fresh load', async () => {
    const first = await freshStore();
    first.updateSettings({ workAreaFont: 'custom', workAreaFontCustom: 'Berkeley Mono' });
    const onDisk = JSON.parse(
      readFileSync(join(userDataDir, 'settings.json'), 'utf8')
    ) as { settings: Record<string, unknown> };
    expect(onDisk.settings['workAreaFont']).toBe('custom');
    expect(onDisk.settings['workAreaFontCustom']).toBe('Berkeley Mono');
    const second = await freshStore();
    expect(second.getSettings().workAreaFontCustom).toBe('Berkeley Mono');
  });
});

describe('the frame hue (Phase 207)', () => {
  it('sanitizes to a whole degree on the circle, else the shipped 222', async () => {
    const store = await freshStore();
    const at = (chromeHue: unknown): number =>
      store.sanitizeSettings({ chromeHue }).chromeHue;
    expect(at(undefined)).toBe(222);
    expect(at('40')).toBe(222);
    expect(at(Number.NaN)).toBe(222);
    expect(at(40)).toBe(40);
    expect(at(360)).toBe(0);
    expect(at(-1)).toBe(359);
    expect(at(40.4)).toBe(40);
  });

  it('survives a patch, a disk write and a fresh load', async () => {
    const store = await freshStore();
    store.updateSettings({ chromeHue: 40 });
    const onDisk = JSON.parse(
      readFileSync(join(userDataDir, 'settings.json'), 'utf8')
    ) as { settings: { chromeHue: number } };
    expect(onDisk.settings.chromeHue).toBe(40);
    const again = await freshStore();
    expect(again.getSettings().chromeHue).toBe(40);
  });

  it('composes the window fill from the persisted hue and follows a change', async () => {
    const store = await freshStore();
    const chrome = await import('../chrome');
    expect(chrome.windowBackgroundNow()).toBe('#131417');
    const writes: string[] = [];
    let destroyed = false;
    let onClosed: (() => void) | null = null;
    const win = {
      isDestroyed: () => destroyed,
      setBackgroundColor: (hex: string) => writes.push(hex),
      once: (_event: string, cb: () => void) => {
        onClosed = cb;
      }
    };
    chrome.followChromeHue(win as never);
    store.updateSettings({ chromeHue: 40 });
    const turned = windowBackgroundFor(40);
    expect(turned).not.toBe('#131417');
    expect(writes).toEqual([turned]);
    // An unrelated change writes nothing.
    store.updateSettings({ scrollbackLines: 20000 });
    expect(writes).toHaveLength(1);
    store.updateSettings({ chromeHue: 222 });
    expect(writes).toEqual([turned, '#131417']);
    destroyed = true;
    store.updateSettings({ chromeHue: 100 });
    expect(writes).toHaveLength(2);
    expect(onClosed).not.toBeNull();
  });

  it('composes the fill from the scheme, and Match the Mac follows nativeTheme (Phase 213)', async () => {
    fakeTheme.shouldUseDarkColors = true;
    fakeTheme.listeners.clear();
    const store = await freshStore();
    const chrome = await import('../chrome');
    expect(chrome.effectiveSchemeNow()).toBe('dark');
    expect(chrome.schemeArgsNow()).toEqual(['--gmux-scheme=dark']);
    const writes: string[] = [];
    let onClosed: (() => void) | null = null;
    const win = {
      isDestroyed: () => false,
      setBackgroundColor: (hex: string) => writes.push(hex),
      once: (_event: string, cb: () => void) => {
        onClosed = cb;
      }
    };
    chrome.followChromeHue(win as never);
    expect(fakeTheme.listeners.size).toBe(1);
    store.updateSettings({ colorScheme: 'light' });
    expect(chrome.effectiveSchemeNow()).toBe('light');
    expect(chrome.schemeArgsNow()).toEqual(['--gmux-scheme=light']);
    expect(writes).toEqual(['#f5f7fa']);
    // A hue on the light base turns the paper, not the graphite.
    store.updateSettings({ chromeHue: 40 });
    expect(writes[1]).toBe(windowBackgroundFor(40, 0, 0, 'light'));
    expect(writes[1]).not.toBe(windowBackgroundFor(40));
    store.updateSettings({ chromeHue: 222, colorScheme: 'system' });
    // The Mac is dark, so system is dark; a flip of the Mac moves the fill
    // with no settings write at all, and a flip while the scheme is not
    // system writes nothing.
    expect(writes[2]).toBe('#131417');
    fakeTheme.flip(false);
    expect(writes[3]).toBe('#f5f7fa');
    fakeTheme.flip(true);
    expect(writes[4]).toBe('#131417');
    store.updateSettings({ colorScheme: 'dark' });
    expect(writes).toHaveLength(5);
    fakeTheme.flip(false);
    expect(writes).toHaveLength(5);
    // Closing the window drops both listeners.
    expect(onClosed).not.toBeNull();
    (onClosed as unknown as () => void)();
    expect(fakeTheme.listeners.size).toBe(0);
    fakeTheme.shouldUseDarkColors = true;
  });
});
