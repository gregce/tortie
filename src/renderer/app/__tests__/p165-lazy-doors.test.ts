/**
 * Phase 165. The lazy doors, read from the source the way p127's test reads
 * the probe loader: each door names its room inside `import(...)` and never
 * in a `from` clause, each room has exactly one production importer, the
 * shell's eager files no longer name the barrels that are doors, the eight
 * surface drives moved into the registry, and every door reads the same store
 * bit its surface reads first.
 *
 * The bundled proof is `build/assert-probe-containment.mjs`, which reads the
 * built output. This file is the source side of the same fact, and it runs in
 * two seconds without a build, so a static import that would drag a surface
 * back into the entry chunk is named here before the build says so in bytes.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const RENDERER = resolve(__dirname, '..', '..');
const REPO = resolve(RENDERER, '..', '..');

/**
 * A file's text with its type only imports and exports removed. Those are
 * erased by the compiler, so `import type { X } from './Room'` is not an edge
 * and must not read as one here.
 */
function stripTypeOnly(text: string): string {
  return text.replace(/^\s*(?:import|export)\s+type\b[^;]*;\s*$/gm, '');
}

function read(...parts: string[]): string {
  return stripTypeOnly(readFileSync(join(RENDERER, ...parts), 'utf8'));
}

function productionFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (name === '__tests__' || name === 'node_modules') continue;
      if (statSync(full).isDirectory()) {
        walk(full);
      } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && !/\.d\.ts$/.test(name)) {
        out.push(full);
      }
    }
  };
  walk(RENDERER);
  return out;
}

/** The doors: [door file, what it imports lazily, who may name that room]. */
const DOORS: Array<[string, string, string[]]> = [
  ['editor/lazy.tsx', './EditorPanel', ['editor/lazy.tsx']],
  ['scm/lazy.tsx', './subject', ['scm/lazy.tsx']],
  ['search/lazy.tsx', './subject', ['search/lazy.tsx']],
  ['context/lazy.tsx', './subject', ['context/lazy.tsx']],
  ['tree/lazy.tsx', './FilesSection', ['tree/lazy.tsx']],
  ['quickopen/lazy.tsx', './QuickOpenPalette', ['quickopen/lazy.tsx']],
  ['app/lazy-modals.tsx', './modals', ['app/lazy-modals.tsx']],
  ['overview/lazy.tsx', './OverviewLayer', ['overview/lazy.tsx']],
  ['arch/lazy.tsx', './subject', ['arch/lazy.tsx']]
];

describe('each door names its room inside import(...) and never in a from clause', () => {
  for (const [door, room] of DOORS) {
    it(`${door} -> ${room}`, () => {
      const text = read(...door.split('/'));
      expect(text).toContain(`import('${room}')`);
      expect(
        new RegExp(`from\\s+['"]${room.replace('.', '\\.')}['"]`).test(text),
        `${door} has a static from clause on ${room}, which defeats the split`
      ).toBe(false);
    });
  }
});

describe('each room has exactly one production importer, its door', () => {
  for (const [door, room, allowed] of DOORS) {
    it(`${room} from ${door.split('/')[0]}`, () => {
      const dir = door.split('/')[0] ?? '';
      const files = productionFiles()
        .filter((f) => relative(RENDERER, f).startsWith(`${dir}/`))
        .filter((f) => {
          const text = stripTypeOnly(readFileSync(f, 'utf8'));
          return new RegExp(`from\\s+['"]${room.replace('.', '\\.')}['"]`).test(text) ||
            text.includes(`import('${room}')`);
        })
        .map((f) => relative(RENDERER, f))
        .sort();
      expect(files, `a second importer of ${room} pulls it back into the entry chunk`).toEqual(allowed);
    });
  }
});

describe('the shell reaches the split domains through leaves, never through a door barrel', () => {
  const forbidden: Array<[string, string[]]> = [
    ['app/App.tsx', ["from '../editor'", "from '../quickopen'", "from '../search'", "from '../context'", "from '../overview/OverviewLayer'", "from './CreateSessionModal'", "from './NewProjectModal'", "from './RemoteProjectModal'", "from './CloneRepoModal'", "from './PastSessionsModal'", "from './SavedOutputModal'", "from './RemoteLinesModal'", "from './ShortcutsOverlay'"]],
    ['app/Sidebar.tsx', ["from '../scm'", "from '../tree'", "from '../search'", "from '../context'", "from '../arch'", "from '../scm/ScmSection'", "from '../tree/FilesSection'", "from '../search/SearchView'", "from '../context/ContextView'", "from '../arch/ArchView'"]],
    ['app/keyboard.ts', ["from '../search'", "from '../quickopen'", "from './ShortcutsOverlay'", "from '../editor'"]],
    ['app/menu-actions.ts', ["from '../search'", "from '../quickopen'", "from '../editor'"]],
    ['app/shell-actions.ts', ["from '../search'"]],
    ['app/fill-chord.ts', ["from '../editor'"]],
    ['app/ActivityBar.tsx', ["from '../search'"]]
  ];
  for (const [file, specs] of forbidden) {
    it(file, () => {
      const text = read(...file.split('/'));
      for (const spec of specs) {
        expect(text.includes(spec), `${file} still has ${spec}`).toBe(false);
      }
    });
  }

  it('the barrels export the doors, not the rooms', () => {
    expect(read('editor', 'index.ts')).toContain("from './lazy'");
    expect(read('editor', 'index.ts')).not.toContain("from './EditorPanel'");
    expect(read('scm', 'index.ts')).not.toContain("from './ScmSection'");
    expect(read('search', 'index.ts')).not.toContain("from './SearchView'");
    expect(read('search', 'index.ts')).not.toContain("import './search.css'");
    expect(read('search', 'subject.ts')).toContain("import './search.css'");
    expect(read('tree', 'index.ts')).not.toContain("from './FilesSection';");
    expect(read('tree', 'index.ts')).not.toContain("from './FileTree'");
    expect(read('context', 'index.ts')).not.toContain("from './ContextView'");
    expect(read('context', 'index.ts')).not.toContain("from './install/InstallHost'");
    expect(read('quickopen', 'index.ts')).not.toContain("from './QuickOpenPalette'");
  });

  it('App.tsx mounts the editor door unconditionally where the panel stood', () => {
    const app = read('app', 'App.tsx');
    const region = app.indexOf('<TerminalRegion />');
    const editor = app.indexOf('<EditorPanelLazy />');
    expect(region).toBeGreaterThan(-1);
    expect(editor).toBeGreaterThan(region);
  });
});

describe('the eight surface drives moved into the registry', () => {
  const moved: Array<[string, string]> = [
    ['editor/EditorPanel.tsx', 'installShotHook('],
    ['scm/ScmSection.tsx', 'registerP97UntrackedDrive('],
    ['scm/ScmSection.tsx', 'registerP103StageDrive('],
    ['scm/ScmSection.tsx', 'registerP104CommitDrive('],
    ['tree/FilesSection.tsx', 'registerTargetShotDrive('],
    ['tree/FilesSection.tsx', 'registerRemoteBootDrive('],
    ['tree/FilesSection.tsx', 'registerP154Probe('],
    ['context/enable/EnableForDialog.tsx', 'registerEnableShotProbe(']
  ];
  for (const [file, call] of moved) {
    it(`${file} no longer calls ${call})`, () => {
      expect(read(...file.split('/')).includes(call)).toBe(false);
    });
  }

  it('the registry arms them first, the base drive before the layout wrapper', () => {
    const registry = read('app', 'probe-registry.ts');
    const order = [
      'installShotHook();',
      'registerP97UntrackedDrive();',
      'registerP103StageDrive();',
      'registerP104CommitDrive();',
      'registerTargetShotDrive();',
      'registerRemoteBootDrive();',
      'registerP154Probe();',
      'registerEnableShotProbe();',
      'armShellPathProbe();'
    ].map((call) => registry.indexOf(call));
    for (const at of order) expect(at).toBeGreaterThan(-1);
    for (let i = 1; i < order.length; i += 1) {
      expect(order[i]).toBeGreaterThan(order[i - 1] ?? -1);
    }
    const install = registry.indexOf('export function installProbes(): void {');
    expect(registry.indexOf('armSurfaceDrives();', install)).toBeGreaterThan(install);
    expect(registry.indexOf('armSurfaceDrives();', install)).toBeLessThan(
      registry.indexOf('installShotLayoutExtras();', install)
    );
  });
});

describe('every door reads the bit its surface reads first', () => {
  const pairs: Array<[string, string, string]> = [
    ['app/lazy-modals.tsx', 's.createOpen', 'app/CreateSessionModal.tsx'],
    ['app/lazy-modals.tsx', 's.newProjectOpen', 'app/NewProjectModal.tsx'],
    ['app/lazy-modals.tsx', 's.remoteProjectOpen', 'app/RemoteProjectModal.tsx'],
    ['app/lazy-modals.tsx', 'useClone((s) => s.open)', 'app/CloneRepoModal.tsx'],
    ['app/lazy-modals.tsx', 's.pastOpen', 'app/PastSessionsModal.tsx'],
    ['app/lazy-modals.tsx', 's.savedOutputSessionId', 'app/SavedOutputModal.tsx'],
    ['app/lazy-modals.tsx', 's.remoteLinesSessionId', 'app/RemoteLinesModal.tsx'],
    ['app/lazy-modals.tsx', 's.shortcutsOpen', 'app/ShortcutsOverlay.tsx'],
    ['quickopen/lazy.tsx', 'useQuickOpen((s) => s.open)', 'quickopen/QuickOpenPalette.tsx'],
    ['search/lazy.tsx', 'useSymbols((s) => s.open)', 'search/SymbolPalette.tsx'],
    ['overview/lazy.tsx', 's.overview !== null', 'app/App.tsx']
  ];
  for (const [door, bit, surface] of pairs) {
    it(`${door} reads ${bit}, as ${surface} does`, () => {
      expect(read(...door.split('/'))).toContain(bit);
      expect(read(...surface.split('/'))).toContain(bit);
    });
  }

  it('the editor door mounts on any tab and calls init, as the panel did', () => {
    const door = read('editor', 'lazy.tsx');
    expect(door).toContain('s.tabs.length > 0');
    expect(door).toContain('init();');
  });

  it('the quick open door owns the two boot time effects the palette had', () => {
    const door = read('quickopen', 'lazy.tsx');
    const palette = read('quickopen', 'QuickOpenPalette.tsx');
    expect(door).toContain('startRecordingRecents()');
    expect(door).toContain('useQuickOpen.getState().warm()');
    expect(palette).not.toContain('startRecordingRecents');
    expect(palette).not.toContain('.warm()');
  });

  it('the install host door reads no store and waits for the chunk instead', () => {
    const door = read('context', 'lazy.tsx');
    expect(door).not.toContain('install-store');
    expect(door).toContain('useSyncExternalStore(subscribeArrival, readArrival)');
  });
});

describe('the build gate names strings that exist in the files it names', () => {
  const gate = readFileSync(join(REPO, 'build', 'assert-probe-containment.mjs'), 'utf8');
  const rows = [...gate.matchAll(/surface: '[^(]*\(([^)]+)\)', marker: '"([^"]+)"'/g)].map((m) => ({
    file: m[1] ?? '',
    marker: m[2] ?? ''
  }));

  it('lists at least the sixteen surfaces of the phase', () => {
    expect(rows.length).toBeGreaterThanOrEqual(16);
  });

  for (const { file, marker } of rows) {
    it(`${marker} is in ${file}`, () => {
      expect(read(...file.split('/'))).toContain(marker);
    });
  }
});
