/**
 * PHASE 175 FIX ROUND — an already-open ARCHITECTURE MAP TAB goes away with
 * everything else when the switch goes off.
 *
 * The phase gated every OPENER and the verifier's app run proved each one
 * refuses. What it also measured is what this file exists for: with the
 * switch on it opened the map through the real `show-arch-map` menu action,
 * turned Architecture off from the real Settings window, and watched the rail
 * mark, all three native menu rows and the Architecture PANE go while the map
 * tab stayed, live, with its tab row still reading Architecture. That is a
 * fully usable Architecture surface on screen after a person turned
 * Architecture off, and the phase's own claim was that turning it off removes
 * all of it in the same session.
 *
 * The pane resolves itself away through `effectiveSidebarView` because it is
 * derived. A tab is STATE, so somebody has to close it, and these tests pin
 * who and when:
 *
 *  - the flip from on to off closes every map tab, whatever is active;
 *  - it closes NOTHING else, because a person's file tabs are not
 *    Architecture and losing them would be the worse bug;
 *  - installing the watch into a window whose switch is already off sweeps
 *    once, so no path can leave one sitting;
 *  - turning the switch back ON opens nothing, because the surface returning
 *    is not the same thing as a person asking for the map.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const readFile = vi.fn(async () => ({ contents: 'body', truncated: false }));
const showHead = vi.fn(async () => '');
const readImage = vi.fn(async () => ({ status: 'ok' }));
const writeFile = vi.fn(async () => undefined);
const readDir = vi.fn(async () => ({ entries: [] as { name: string }[] }));

vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  gmux: {
    fs: { readFile, readImage, writeFile, readDir },
    git: { showHead, onChanged: () => () => undefined }
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } }
});

const { useEditor } = await import('../store');
const { useSettingsStore } = await import('../../settings/settings-store');
const { closeArchMapTabs, watchArchSurfaceOff } = await import(
  '../../arch/open-map'
);
type OpenFileRequest = import('../../state/open-file').OpenFileRequest;

const REPO = '/Users/op/project';

function mapReq(repoPath = REPO): OpenFileRequest {
  return {
    repoPath,
    relPath: '',
    path: repoPath,
    mode: 'file',
    source: 'tree',
    preview: false,
    archMap: { repoPath }
  };
}

function fileReq(relPath: string): OpenFileRequest {
  return {
    repoPath: REPO,
    relPath,
    path: `${REPO}/${relPath}`,
    mode: 'file',
    source: 'tree',
    preview: false
  };
}

/** Flip the real switch in the real store, the way main's broadcast does. */
function archSwitch(on: boolean): void {
  useSettingsStore.setState((s) => ({
    settings: { ...s.settings, arch: { ...s.settings.arch, enabled: on } }
  }));
}

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

const mapTabs = (): unknown[] =>
  useEditor.getState().tabs.filter((t) => t.archMap !== undefined);

const stops: (() => void)[] = [];

beforeEach(() => {
  for (const stop of stops.splice(0)) stop();
  useEditor.setState({ tabs: [], activeId: null, panelOpen: false });
  archSwitch(true);
  vi.clearAllMocks();
});

function watch(): void {
  stops.push(watchArchSurfaceOff());
}

describe('the map tab and the switch', () => {
  it('closes the open map tab when the switch goes off', async () => {
    watch();
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    expect(mapTabs()).toHaveLength(1);

    archSwitch(false);

    expect(mapTabs()).toHaveLength(0);
    expect(useEditor.getState().tabs).toHaveLength(0);
    // Nothing is left selected, and an empty editor closes its panel.
    expect(useEditor.getState().activeId).toBeNull();
    expect(useEditor.getState().panelOpen).toBe(false);
  });

  it('closes a map tab that is not the active one', async () => {
    watch();
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    useEditor.getState().openFromRequest(fileReq('src/a.ts'));
    await flush();
    expect(useEditor.getState().tabs).toHaveLength(2);

    archSwitch(false);

    expect(mapTabs()).toHaveLength(0);
    expect(useEditor.getState().tabs).toHaveLength(1);
  });

  it('closes every repository map at once and keeps every file tab', async () => {
    watch();
    useEditor.getState().openFromRequest(mapReq('/a'));
    await flush();
    useEditor.getState().openFromRequest(mapReq('/b'));
    await flush();
    useEditor.getState().openFromRequest(fileReq('src/a.ts'));
    await flush();
    useEditor.getState().openFromRequest(fileReq('src/b.ts'));
    await flush();
    expect(useEditor.getState().tabs).toHaveLength(4);

    archSwitch(false);

    expect(mapTabs()).toHaveLength(0);
    expect(useEditor.getState().tabs.map((t) => t.relPath)).toEqual([
      'src/a.ts',
      'src/b.ts'
    ]);
  });

  it('sweeps once at install, so an already-off window holds none', async () => {
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    archSwitch(false);
    expect(mapTabs()).toHaveLength(1); // nothing is watching yet

    watch();

    expect(mapTabs()).toHaveLength(0);
  });

  it('opens nothing when the switch comes back on', async () => {
    watch();
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    archSwitch(false);
    expect(mapTabs()).toHaveLength(0);

    archSwitch(true);
    await flush();

    expect(mapTabs()).toHaveLength(0);
    expect(useEditor.getState().tabs).toHaveLength(0);
  });

  it('leaves the map alone while the switch stays on', async () => {
    watch();
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    // A settings change that is not this switch must not disturb the tab.
    useSettingsStore.setState((s) => ({ settings: { ...s.settings } }));
    expect(mapTabs()).toHaveLength(1);
  });

  it('stops closing once the watch is unsubscribed', async () => {
    const stop = watchArchSurfaceOff();
    useEditor.getState().openFromRequest(mapReq());
    await flush();
    stop();

    archSwitch(false);

    expect(mapTabs()).toHaveLength(1);
  });
});

describe('the sweep itself', () => {
  it('is a no-op on a window with no map tab open', async () => {
    useEditor.getState().openFromRequest(fileReq('src/a.ts'));
    await flush();
    closeArchMapTabs();
    expect(useEditor.getState().tabs).toHaveLength(1);
  });
});
