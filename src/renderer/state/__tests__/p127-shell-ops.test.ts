/**
 * The store's shell seam, and the wall it exists to keep (Phase 127).
 *
 * THE RULE. The store is composed BY the app shell and the editor, so no
 * production file under `src/renderer/state/` may name either of them.
 * `build/assert-import-boundaries.mjs` enforces that as DIRECTORY_WALLS and
 * proves it with ten fixtures. This file is the second half of the proof. It
 * checks the seam that makes the rule livable, being
 * `src/renderer/state/shell-ops.ts`, and it reads the source text of the state
 * directory so a reader sees the wall stated in a test as well as in a gate.
 *
 * IT READS TEXT RATHER THAN A MODULE GRAPH, which is the Phase 126 house
 * shape. A rule a person can read in the failure message is what teaches the
 * next round.
 *
 * WHAT IT CANNOT DO. It cannot prove the four real operations behave. Those
 * belong to the app shell and are covered where they live. It proves that the
 * store calls exactly four named things it does not own, that the defaults are
 * silent, and that the composition root fills them.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MenuSpec } from '../../menus/spec';
import { installShellOps, resetShellOps, shellOps } from '../shell-ops';

const STATE_DIR = join(process.cwd(), 'src/renderer/state');
const MAIN_TSX = join(process.cwd(), 'src/renderer/main.tsx');

/** Every production `.ts` file directly under src/renderer/state. */
function productionFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Every import-like specifier in one file, with the line it sits on. It
 * matches the same four shapes the boundary gate matches, being a `from`
 * clause, a side-effect import, a dynamic import and a require.
 */
function specifiers(text: string): { line: number; spec: string }[] {
  const found: { line: number; spec: string }[] = [];
  text.split('\n').forEach((line, index) => {
    const patterns = [
      /\bfrom\s+'([^']+)'/g,
      /^\s*import\s+'([^']+)'/g,
      /\bimport\s*\(\s*'([^']+)'\s*\)/g,
      /\brequire\s*\(\s*'([^']+)'\s*\)/g
    ];
    for (const pattern of patterns) {
      for (const match of line.matchAll(pattern)) {
        found.push({ line: index + 1, spec: match[1] ?? '' });
      }
    }
  });
  return found;
}

describe('the state layer names neither of its composition owners', () => {
  const files = productionFiles(STATE_DIR);

  it('reads a directory that actually has files in it', () => {
    expect(files.length).toBeGreaterThan(15);
  });

  it('names no file under src/renderer/app or src/renderer/editor', () => {
    const offenders: string[] = [];
    for (const name of files) {
      const text = readFileSync(join(STATE_DIR, name), 'utf8');
      for (const { line, spec } of specifiers(text)) {
        if (/^(\.\.\/(app|editor)\/|@renderer\/(app|editor)\/)/.test(spec)) {
          offenders.push(`${name}:${line} imports '${spec}'`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps the edges to scm and settings, which this rule does not cover', () => {
    // The rule is app and editor, and it was deliberately not widened.
    // src/renderer/state/git.ts reads ../scm/groups, and sessions-slice.ts and
    // specstory.ts read ../settings. A later round that wants those covered
    // must say so, and until then this test records that they are allowed.
    const all = files
      .map((name) => readFileSync(join(STATE_DIR, name), 'utf8'))
      .join('\n');
    expect(all).toContain("from '../scm/groups'");
    expect(all).toContain("from '../settings/");
  });
});

describe('the seam itself', () => {
  beforeEach(() => {
    resetShellOps();
  });

  it('defaults to four silent no-ops, so a missing install loses nothing loudly', () => {
    const ops = shellOps();
    expect(() => ops.showNativeMenu({ x: 0, y: 0, items: [] })).not.toThrow();
    expect(() => ops.cancelPointerDrag()).not.toThrow();
    expect(() => ops.focusFleetPrimary()).not.toThrow();
    expect(() => ops.ensureEditorSubscribed()).not.toThrow();
    expect(ops.showNativeMenu({ x: 0, y: 0, items: [] })).toBeUndefined();
  });

  it('hands back what was installed', () => {
    const showNativeMenu = vi.fn();
    const cancelPointerDrag = vi.fn();
    const focusFleetPrimary = vi.fn();
    const ensureEditorSubscribed = vi.fn();
    installShellOps({
      showNativeMenu,
      cancelPointerDrag,
      focusFleetPrimary,
      ensureEditorSubscribed
    });
    const menu: MenuSpec = { x: 3, y: 4, items: [] };
    shellOps().showNativeMenu(menu);
    expect(showNativeMenu).toHaveBeenCalledWith(menu);
  });
});

describe('the composition root fills the seam', () => {
  const text = readFileSync(MAIN_TSX, 'utf8');

  it('imports the installer from the app shell', () => {
    expect(text).toContain("from './app/shell-ops-install'");
  });

  it('calls it before createRoot, so no store action can run against a no-op', () => {
    const install = text.indexOf('installAppShellOps()');
    const render = text.indexOf('createRoot(');
    expect(install).toBeGreaterThan(-1);
    expect(render).toBeGreaterThan(-1);
    expect(install).toBeLessThan(render);
  });
});

describe('the installer names the four real implementations', () => {
  const text = readFileSync(
    join(process.cwd(), 'src/renderer/app/shell-ops-install.ts'),
    'utf8'
  );

  it('takes the native menu from the one bridge helper', () => {
    expect(text).toContain("from './ContextMenu'");
  });

  it('takes the drag revoke from the split pointer module', () => {
    expect(text).toContain("from './split/pointer-drag'");
  });

  it('takes the fleet handoff from the focus trap', () => {
    expect(text).toContain("from './focus-trap'");
  });

  it('takes the editor subscription from the editor store', () => {
    expect(text).toContain("from '../editor/store'");
    expect(text).toContain('init()');
  });
});
