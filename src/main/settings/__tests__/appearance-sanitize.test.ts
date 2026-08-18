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

let userDataDir = '';

// The two electron surfaces store.ts touches, following the fake in
// danger-seal.test.ts. No test here stores a danger value, so the keystore
// half exists only so the module loads.
vi.mock('electron', () => ({
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
