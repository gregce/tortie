/**
 * Phase 127. The probe chunk has exactly one door, and it is a dynamic one.
 *
 * WHAT THIS TEST CAN AND CANNOT SEE. It reads source text. It proves the SHAPE
 * that lets Rollup split the chunk, being one importer and an `import(...)`
 * rather than a `from` clause. It cannot prove the built artifact, because
 * vitest runs the source and the bundler ships something else. That half is
 * `build/assert-probe-containment.mjs`, which reads out/renderer/assets/ and
 * runs inside `npm run build`. Both halves are needed and neither replaces the
 * other. This is the same instrument and the same reasoning as
 * src/main/sessions/__tests__/p125-core-split.test.ts.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_DIR = join(HERE, '..');
const SRC = resolve(HERE, '..', '..', '..');

const read = (...parts: string[]): string =>
  readFileSync(join(...parts), 'utf8');

/** Every production source file under src/, tests and type declarations out. */
function productionFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name === '__tests__' || name === 'node_modules') continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      if (name.endsWith('.d.ts')) continue;
      out.push(full);
    }
  };
  walk(SRC);
  return out;
}

describe('the probe registry has one importer', () => {
  const files = productionFiles();
  const importers = files.filter((f) =>
    /['"][^'"]*probe-registry['"]/.test(readFileSync(f, 'utf8'))
  );

  it('is named by exactly one production file', () => {
    expect(
      importers.map((f) => relative(SRC, f)),
      'src/renderer/app/probe-loader.ts is the only door onto the probe ' +
        'chunk. A second importer would pull all fourteen probe modules back ' +
        'into the entry chunk a person loads.'
    ).toEqual(['renderer/app/probe-loader.ts']);
  });

  it('names it inside import(...) and never in a from clause', () => {
    const loader = read(APP_DIR, 'probe-loader.ts');
    expect(loader).toContain("await import('./probe-registry')");
    expect(
      /from\s+['"]\.\/probe-registry['"]/.test(loader),
      'a static `from` clause would defeat the split entirely'
    ).toBe(false);
  });
});

describe('the loader answers safely where there is no window', () => {
  it('imports without throwing and reports not armed', async () => {
    // This test environment is node and has no `window` at all. The read of
    // `window.location.search` is inside a try/catch for exactly that reason.
    // A loader that threw at module scope would take the whole renderer with
    // it on any surface that is not a browser window.
    const { probesArmed } = await import('../probe-loader');
    expect(probesArmed()).toBe(false);
  });
});

describe('App.tsx no longer carries the probes', () => {
  const app = read(APP_DIR, 'App.tsx');

  it('imports none of the fourteen probe modules', () => {
    for (const spec of [
      './p93-attention-drive',
      './p96-remote-surfaces-drive',
      '../terminal/p95-scroll-drive',
      '../zoom/shot-probe',
      '../quickopen/shot-probe',
      '../search/shot-probe',
      '../context/shot-probe',
      './focus-shot-drive',
      './shell-path-shot-drive',
      './p100-lines-shot',
      '../scm/p105-runs-shot',
      '../scm/p106-branch-shot',
      '../scm/p107-history-shot',
      '../scm/p120-runs-shot'
    ]) {
      expect(app.includes(`from '${spec}'`), `App.tsx still imports ${spec}`).toBe(
        false
      );
    }
  });

  it('calls none of the four registrars', () => {
    for (const call of [
      'armShellPathProbe(',
      'registerP93AttentionDrive(',
      'registerP96RemoteSurfacesDrive(',
      'registerP95ScrollDrive('
    ]) {
      expect(app.includes(call), `App.tsx still calls ${call})`).toBe(false);
    }
  });
});

describe('the registry keeps the order App.tsx used', () => {
  const registry = read(APP_DIR, 'probe-registry.ts');

  it('arms the four drives in the recorded order', () => {
    const order = [
      'armShellPathProbe();',
      'registerP93AttentionDrive();',
      'registerP96RemoteSurfacesDrive();',
      'registerP95ScrollDrive();'
    ].map((call) => registry.indexOf(call));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    for (let i = 1; i < order.length; i += 1) {
      expect(
        order[i],
        'the shell-path probe is armed first because the moment it has to ' +
          'see is over before any drive can start'
      ).toBeGreaterThan(order[i - 1] ?? -1);
    }
  });

  it('keeps the wrapper guard and the cleanup chain', () => {
    expect(registry).toContain("if (typeof prev !== 'function') return;");
    expect(registry).toContain('await prevCleanup?.();');
  });

  it('dispatches a real capture-phase keydown for projectDigit', () => {
    // The whole point of the phase. A drive that called the store instead
    // would photograph the harness rather than the shipped handler.
    expect(registry).toContain('window.dispatchEvent(');
    expect(registry).toContain("new KeyboardEvent('keydown', {");
  });
});

describe('main.tsx loads the probes before the first render', () => {
  const main = read(SRC, 'renderer', 'main.tsx');

  it('awaits loadProbes above createRoot', () => {
    const load = main.indexOf('await loadProbes();');
    const render = main.indexOf('createRoot(rootEl)');
    expect(load).toBeGreaterThan(-1);
    expect(render).toBeGreaterThan(load);
  });

  it('does that inside an async function and NEVER at the top level', () => {
    // A top level await here deadlocks the whole renderer. A module with a
    // top level await is an async module, and every module that imports it
    // waits for it to finish. probe-registry.ts imports the store and the
    // shell, which are in this same entry chunk, so the entry chunk waited
    // for the probe chunk and the probe chunk waited for the entry chunk.
    // Measured on 2026-08-22: the window rendered nothing at all.
    expect(main).toContain('void (async (): Promise<void> => {');
    expect(
      /^await loadProbes\(\);/m.test(main),
      'loadProbes must not be awaited at the top level of this module'
    ).toBe(false);
  });
});
