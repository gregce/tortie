/**
 * The harness drive for build/probe-p207-hue.mjs (Phase 207). It assigns one
 * object to `window` when its registrar is called, from
 * src/renderer/app/probe-registry.ts on a launch whose URL carries harness=1,
 * and reads nothing until the probe calls a method on it. Nothing here runs
 * in a normal launch.
 *
 * PHASE 210 added the two ramp stops to the same drive rather than writing a
 * second one, because the surfaces to read and the way to read them did not
 * change: only the settings that move them did. The shade and the depth go
 * through the same bridge and the same broadcast.
 *
 * PHASE 213 added the scheme the same way, plus the surfaces a scheme
 * reaches that a hue did not have to: the root's attribute and computed
 * color-scheme, the Pierre diff host read across its shadow root, the
 * first tree row, Monaco's theme name, xterm's contrast floor, and two
 * openers, one for a diff and one for its Redline mode. Read by
 * build/probe-p213-scheme.mjs.
 *
 * THE PROBE STAYS ON THE SHIPPED PATH. A hue is set through the same
 * settings bridge the Appearance slider uses, the applier reacts to the same
 * broadcast, and every colour is read back off the DOM as the compositor
 * sees it: computed background and text colour of the titlebar, the sidebar,
 * the Explorer tree host, the body (the canvas), the terminal host, the live
 * xterm theme and the Monaco editor. The one thing the drive reaches that no
 * setting can is the SYNTHETIC GROUND, `setProbeGroundLift` in ./apply.ts,
 * because the text flip cannot be reached by any hue and the phase promised
 * to drive it in the real app rather than only under node.
 */

import { useApp } from '../state/store';
import { useEditor } from '../editor/store';
import { getLoadedMonaco } from '../editor/monaco-loader';
import { getTerminal } from '../terminal/drop/registry';
import { gmuxBridge } from '../bridge';
import { probeGroundLiftNow, setProbeGroundLift } from './apply';
import { useChromeTheme } from './chrome-theme';
import type { ColorScheme } from '@shared/settings';

/** One element as the compositor paints it. Null when it is not mounted. */
export interface P207Paint {
  background: string;
  color: string;
}

export interface P207Reading {
  /** The persisted scheme (Phase 213) and the base it resolved to. */
  colorScheme: string;
  scheme: 'light' | 'dark';
  /** The root's data-scheme attribute and computed color-scheme. */
  rootScheme: string | null;
  rootColorScheme: string;
  /** xterm's minimumContrastRatio on the first terminal, or null. */
  terminalContrastFloor: number | null;
  /** The Pierre diff host, read across its shadow root, or null. */
  pierre: {
    hostBackground: string;
    hostColorScheme: string;
    lightBg: string;
    darkBg: string;
    innerBackground: string | null;
    innerColor: string | null;
    firstTokenLight: string | null;
    firstTokenDark: string | null;
  } | null;
  /** The first tree row inside the Explorer's shadow root, or null. */
  treeRow: P207Paint | null;
  /** Monaco's theme name as the editor holds it, or null. */
  monacoTheme: string | null;
  /** The persisted hue, as the settings bridge answers it. */
  chromeHue: number;
  /** The persisted ramp stops (Phase 210), from the same answer. */
  chromeShade: number;
  chromeDepth: number;
  /** The synthetic ground in effect, 0 in every real launch. */
  groundLift: number;
  /** What the applier last published. */
  canvas: string;
  textDark: boolean;
  /** The override map the applier last wrote, every token it moved. */
  overrides: Record<string, string>;
  /** Computed values of the tokens on the document root. */
  tokens: Record<string, string>;
  /** Computed paint of each element, by the selector it was found under. */
  paint: Record<string, P207Paint | null>;
  /** The live xterm theme of the first terminal, as xterm holds it. */
  terminal: { background: string; foreground: string; cursor: string } | null;
  /** Whether a Monaco editor is mounted. */
  editors: number;
}

const SELECTORS = [
  '.titlebar',
  '.activity-bar',
  '.sidebar',
  '.files-tree',
  'file-tree-container',
  'body',
  '.gmux-terminal-host',
  '.monaco-editor',
  '.monaco-editor-background',
  '.monaco-editor .view-lines',
  // Phase 213: the editor panel and its tabs, the diff and redline hosts,
  // the Architecture pane and its map, the Settings window's section.
  '.ed-panel',
  '.ed-tabs',
  '.ed-pierre',
  // The Redline's scroller carries the canvas and its document the text
  // (src/renderer/editor/redline.css). `.redline` is the STYLESHEET's name
  // and no element's, which is what made this surface read as unmounted on
  // the first p213 run.
  '.ed-redline-scroll',
  '.ed-redline-doc',
  '[data-view="arch"]',
  '[data-slot="arch-map-tab"]',
  '.arch-map-box rect',
  'section[aria-label="Appearance"]',
  '.set-card'
];

const TOKENS = [
  '--bg-canvas',
  '--bg-sidebar',
  '--bg-surface',
  '--bg-raised',
  '--bg-active',
  '--border',
  '--border-active',
  '--border-strong',
  '--text-primary',
  '--text-secondary',
  '--text-muted',
  '--text-disabled'
];

const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

function paintOf(selector: string): P207Paint | null {
  const el = document.querySelector(selector);
  if (el === null) return null;
  const styles = getComputedStyle(el);
  // An SVG shape paints its fill, not a background.
  if (el instanceof SVGElement) return { background: styles.fill, color: styles.stroke };
  return { background: styles.backgroundColor, color: styles.color };
}

/** The Pierre diff host and what its shadow root resolved (Phase 213). */
function pierreOf(): P207Reading['pierre'] {
  const container = document.querySelector('.ed-pierre');
  if (container === null) return null;
  const host =
    container.querySelector('diffs-container') ??
    Array.from(container.querySelectorAll('*')).find((e) => e.shadowRoot !== null) ??
    null;
  const shadow = host?.shadowRoot ?? null;
  if (host === null || shadow === null) return null;
  const cs = getComputedStyle(host);
  const pre = shadow.querySelector('pre') ?? shadow.querySelector('[data-line]');
  const token = shadow.querySelector('[style*="--diffs-token-light"]') as HTMLElement | null;
  return {
    hostBackground: cs.backgroundColor,
    hostColorScheme: cs.colorScheme,
    lightBg: cs.getPropertyValue('--diffs-light-bg').trim(),
    darkBg: cs.getPropertyValue('--diffs-dark-bg').trim(),
    innerBackground: pre === null ? null : getComputedStyle(pre).backgroundColor,
    innerColor: pre === null ? null : getComputedStyle(pre).color,
    firstTokenLight: token === null ? null : token.style.getPropertyValue('--diffs-token-light').trim(),
    firstTokenDark: token === null ? null : token.style.getPropertyValue('--diffs-token-dark').trim()
  };
}

function treeRowOf(): P207Paint | null {
  const host = document.querySelector('file-tree-container');
  const row = host?.shadowRoot?.querySelector('[data-item-type]') ?? null;
  if (row === null) return null;
  const cs = getComputedStyle(row);
  return { background: cs.backgroundColor, color: cs.color };
}

async function readNow(): Promise<P207Reading> {
  const bridge = gmuxBridge();
  const settings =
    typeof bridge?.settingsGet === 'function' ? await bridge.settingsGet() : null;
  const root = getComputedStyle(document.documentElement);
  const tokens: Record<string, string> = {};
  for (const token of TOKENS) tokens[token] = root.getPropertyValue(token).trim();
  const paint: Record<string, P207Paint | null> = {};
  for (const selector of SELECTORS) paint[selector] = paintOf(selector);
  const session = useApp.getState().sessions[0];
  const term = session === undefined ? null : getTerminal(session.id);
  const theme = term?.options.theme;
  const state = useChromeTheme.getState();
  const rootEl = document.documentElement;
  const monaco = getLoadedMonaco();
  const firstEditor = monaco?.editor.getEditors()[0] ?? null;
  const themeService = (firstEditor as unknown as { _themeService?: { getColorTheme?: () => { themeName: string } } } | null)?._themeService;
  return {
    colorScheme: String(settings?.colorScheme ?? ''),
    scheme: state.scheme,
    rootScheme: rootEl.getAttribute('data-scheme'),
    rootColorScheme: getComputedStyle(rootEl).colorScheme,
    terminalContrastFloor: term?.options.minimumContrastRatio ?? null,
    pierre: pierreOf(),
    treeRow: treeRowOf(),
    monacoTheme: themeService?.getColorTheme?.().themeName ?? null,
    chromeHue: settings?.chromeHue ?? Number.NaN,
    chromeShade: settings?.chromeShade ?? Number.NaN,
    chromeDepth: settings?.chromeDepth ?? Number.NaN,
    groundLift: probeGroundLiftNow(),
    canvas: state.canvas,
    textDark: state.textDark,
    overrides: { ...state.overrides },
    tokens,
    paint,
    terminal:
      theme === undefined
        ? null
        : {
            background: theme.background ?? '',
            foreground: theme.foreground ?? '',
            cursor: theme.cursor ?? ''
          },
    editors: getLoadedMonaco()?.editor.getEditors().length ?? 0
  };
}

export interface P207Drive {
  /** Persist a hue through the bridge and wait for the applier to land it. */
  hue(chromeHue: number): Promise<P207Reading>;
  /** Persist any of the three appearance settings the same way. */
  appearance(patch: {
    highlightScheme?: 'blue' | 'teal' | 'purple' | 'slate';
    contrastLevel?: 'normal' | 'raised' | 'high';
    chromeHue?: number;
    chromeShade?: number;
    chromeDepth?: number;
    colorScheme?: ColorScheme;
  }): Promise<P207Reading>;
  /**
   * Open one file as a DIFF against HEAD and wait for the Pierre surface
   * (Phase 213); `redline` then switches the open diff to the Redline mode.
   */
  openDiff(spec: { repoPath: string; relPath: string; path: string }): Promise<P207Reading>;
  redline(spec: { repoPath: string; relPath: string; path: string }): Promise<P207Reading>;
  /** Bring one already open tab to the front by its path, and read. */
  activate(path: string): Promise<P207Reading>;
  /** Put the sidebar back on the Explorer, and read. */
  explorer(): Promise<P207Reading>;
  /** Bring the Architecture map tab to the front, and read. */
  archMap(): Promise<P207Reading>;
  /** Put the sidebar on the Architecture pane, and read. */
  archPane(): Promise<P207Reading>;
  /** Set the synthetic ground and wait for the applier to land it. */
  ground(lift: number): Promise<P207Reading>;
  /** Open one real file in the editor and wait for Monaco to mount. */
  openFile(spec: { repoPath: string; relPath: string; path: string }): Promise<P207Reading>;
  read(): Promise<P207Reading>;
}

async function settle(expectCanvas: string | null): Promise<P207Reading> {
  for (let i = 0; i < 40; i += 1) {
    await wait(100);
    if (expectCanvas === null) break;
    if (useChromeTheme.getState().canvas === expectCanvas) break;
  }
  await wait(300);
  return readNow();
}

const drive: P207Drive = {
  async hue(chromeHue) {
    return drive.appearance({ chromeHue });
  },
  async appearance(patch) {
    const bridge = gmuxBridge();
    if (typeof bridge?.settingsSet !== 'function') {
      throw new Error('the settings bridge is not present');
    }
    await bridge.settingsSet(patch);
    // The applier lands the broadcast on the next tick; a fixed settle is
    // enough because the reading below compares against the persisted hue
    // rather than against a guessed colour.
    await wait(600);
    return readNow();
  },
  async ground(lift) {
    setProbeGroundLift(lift);
    return settle(null);
  },
  async openFile(spec) {
    await useApp.getState().addProjectPath(spec.repoPath);
    await wait(600);
    // The Explorer, so the Pierre tree host is on screen to be read.
    useApp.getState().showSidebarView('explorer');
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('.files-tree') !== null) break;
      await wait(250);
    }
    useEditor.getState().openFromRequest({
      repoPath: spec.repoPath,
      relPath: spec.relPath,
      path: spec.path,
      mode: 'file',
      source: 'tree',
      preview: false
    });
    for (let i = 0; i < 80; i += 1) {
      if ((getLoadedMonaco()?.editor.getEditors().length ?? 0) > 0) break;
      await wait(250);
    }
    await wait(600);
    return readNow();
  },
  async openDiff(spec) {
    useEditor.getState().openFromRequest({
      repoPath: spec.repoPath,
      relPath: spec.relPath,
      path: spec.path,
      mode: 'diff',
      source: 'tree',
      preview: false
    });
    for (let i = 0; i < 80; i += 1) {
      if (pierreOf()?.innerBackground !== undefined && pierreOf() !== null && document.querySelector('.ed-skeleton') === null) break;
      await wait(250);
    }
    await wait(600);
    return readNow();
  },
  async redline(spec) {
    // The redline is a MODE of the same tab rather than a control on the diff
    // toolbar, which DiffControls.tsx says in as many words, so it is opened
    // the way the Editor mode control opens it: the tab first, then setMode.
    const editor = useEditor.getState();
    editor.openFromRequest({
      repoPath: spec.repoPath,
      relPath: spec.relPath,
      path: spec.path,
      mode: 'diff',
      source: 'tree',
      preview: false
    });
    for (let i = 0; i < 40; i += 1) {
      if (useEditor.getState().tabs.some((entry) => entry.path === spec.path)) break;
      await wait(150);
    }
    const opened = useEditor.getState().tabs.find((entry) => entry.path === spec.path);
    if (opened !== undefined) useEditor.getState().setMode(opened.id, 'redline');
    for (let i = 0; i < 60; i += 1) {
      if (document.querySelector('.ed-redline-doc') !== null) break;
      await wait(250);
    }
    await wait(400);
    return readNow();
  },
  async activate(path) {
    const state = useEditor.getState();
    const tab = state.tabs.find((entry) => entry.path === path);
    if (tab !== undefined) state.activate(tab.id);
    await wait(600);
    return readNow();
  },
  async explorer() {
    useApp.getState().showSidebarView('explorer');
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('file-tree-container') !== null) break;
      await wait(250);
    }
    await wait(400);
    return readNow();
  },
  async archPane() {
    useApp.getState().showSidebarView('arch');
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('[data-view="arch"]') !== null) break;
      await wait(250);
    }
    await wait(400);
    return readNow();
  },
  async archMap() {
    // The map is a tab like any other and it carries no path, so it is found
    // by the one field EditorPanel.tsx switches on.
    const state = useEditor.getState();
    const tab = state.tabs.find((entry) => entry.archMap !== undefined);
    if (tab !== undefined) state.activate(tab.id);
    for (let i = 0; i < 40; i += 1) {
      if (document.querySelector('[data-slot="arch-map-tab"] svg') !== null) break;
      await wait(250);
    }
    await wait(400);
    return readNow();
  },
  read: readNow
};

declare global {
  interface Window {
    /** `window.__gmuxP207`: the Phase 207 hue drive. */
    __gmuxP207?: P207Drive;
  }
}

export function registerP207HueDrive(): void {
  window.__gmuxP207 = drive;
}
